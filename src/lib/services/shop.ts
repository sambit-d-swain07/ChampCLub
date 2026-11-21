import { prisma, withDbRetry } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { Prisma } from "@prisma/client";

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface PlaceOrderInput {
  items: OrderItemInput[];
  channel: "COUNTER" | "ONLINE";
  memberId?: string | null;
  guestName?: string | null;
  fulfilment?: "PICKUP" | "DELIVERY";
  deliveryAddress?: string | null;
  paymentMethod?: "CASH" | "CARD" | "UPI" | "ONLINE";
  clientRequestId?: string | null;
}

// In-memory idempotency cache for completed orders (5-minute TTL)
const idempotencyCache = new Map<string, { order: any; timestamp: number }>();

function cleanupIdempotencyCache() {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) {
      idempotencyCache.delete(key);
    }
  }
}

/**
 * Places a shop order inside a single fast transaction.
 * Reads are executed in parallel before entering the transaction.
 * Writes are atomic and record StockMovement and LedgerEntry rows.
 */
export async function placeOrder(input: PlaceOrderInput) {
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Order must contain at least one product item." };
  }

  // Validate quantities
  for (const item of input.items) {
    if (!item.quantity || item.quantity <= 0) {
      return { success: false, error: "Invalid item quantity." };
    }
  }

  // Idempotency check: if clientRequestId was already completed, return cached order
  if (input.clientRequestId) {
    cleanupIdempotencyCache();
    const cached = idempotencyCache.get(input.clientRequestId);
    if (cached) {
      console.log(`[placeOrder] Returning cached order for idempotency key: ${input.clientRequestId}`);
      return { success: true, order: cached.order };
    }
  }

  try {
    // 1. Parallel reads outside the transaction to minimize transaction hold time
    const productIds = input.items.map((i) => i.productId);
    const [entitlement, products] = await Promise.all([
      input.memberId ? resolve(input.memberId, new Date()) : Promise.resolve(null),
      prisma.product.findMany({
        where: { id: { in: productIds }, archivedAt: null },
      }),
    ]);

    const discountPct = entitlement?.shopDiscountPct || 0;

    if (products.length !== productIds.length) {
      return { success: false, error: "One or more selected products are unavailable or out of stock." };
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Pre-calculate line items & total order amount
    const lineItemsData: Array<{
      productId: string;
      quantity: number;
      priceSnapshot: number;
      discountSnapshot: number;
      lineTotal: number;
      costPrice: number;
    }> = [];

    let totalOrderAmount = 0;

    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      if (product.stockQty < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for "${product.name}". Requested ${item.quantity}, but only ${product.stockQty} in stock.`,
        };
      }

      const basePrice = Number(product.price);
      const discountAmt = (basePrice * discountPct) / 100;
      const netUnitPrice = Math.max(0, basePrice - discountAmt);
      const lineTotal = netUnitPrice * item.quantity;

      totalOrderAmount += lineTotal;

      lineItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        priceSnapshot: basePrice,
        discountSnapshot: discountAmt,
        lineTotal,
        costPrice: Number(product.costPrice || 0),
      });
    }

    const isCounter = input.channel === "COUNTER";
    const orderStatus = isCounter ? "COMPLETED" : "PENDING";
    const fulfilment = input.fulfilment || "PICKUP";
    const paymentMethod = input.paymentMethod || (isCounter ? "CASH" : "ONLINE");
    const isCashOnline = !isCounter && paymentMethod === "CASH";

    // 2. Execute short write transaction with automatic retry on connection errors only
    const executeWriteTx = async () => {
      return await prisma.$transaction(
        async (tx) => {
          // Atomic stock decrements + StockMovement recording
          for (const item of input.items) {
            const count = await tx.$executeRaw`
              UPDATE "Product"
              SET "stockQty" = "stockQty" - ${item.quantity},
                  "updatedAt" = NOW()
              WHERE "id" = ${item.productId}
                AND "stockQty" >= ${item.quantity}
            `;

            if (count === 0) {
              const p = productMap.get(item.productId);
              throw new Error(`Insufficient stock for "${p?.name || item.productId}".`);
            }

            // Create StockMovement record
            const smId = 'c_sm_s_' + Math.random().toString(36).substring(2, 12);
            await tx.$executeRaw`
              INSERT INTO "StockMovement" ("id", "itemType", "itemId", "type", "quantityChange", "unitCost", "note", "createdAt")
              VALUES (${smId}, 'PRODUCT', ${item.productId}, 'SALE', ${-item.quantity}, ${productMap.get(item.productId)?.costPrice || 0}, ${'Order sale (' + input.channel + ')'}, NOW())
            `;
          }

          // Create ShopOrder and ShopOrderItems
          const order = await tx.shopOrder.create({
            data: {
              memberId: input.memberId || null,
              channel: input.channel,
              fulfilment,
              status: orderStatus,
              totalAmount: totalOrderAmount,
              deliveryAddress: input.deliveryAddress || null,
              paymentMethod: paymentMethod,
              items: {
                create: lineItemsData.map((line) => ({
                  productId: line.productId,
                  quantity: line.quantity,
                  priceSnapshot: line.priceSnapshot,
                  discountSnapshot: line.discountSnapshot,
                })),
              },
            },
            include: {
              items: {
                include: { product: true },
              },
              member: {
                include: { user: true },
              },
            },
          });

          // Ledger Entry: EARNED (always recognized immediately)
          await tx.ledgerEntry.create({
            data: {
              source: "SHOP",
              amount: totalOrderAmount,
              method: paymentMethod,
              kind: "EARNED",
              refType: "SHOP_ORDER",
              refId: order.id,
              createdAt: new Date(),
            },
          });

          // Ledger Entry: COLLECTED (recognized immediately except for cash-on-delivery online orders)
          if (!isCashOnline) {
            await tx.ledgerEntry.create({
              data: {
                source: "SHOP",
                amount: totalOrderAmount,
                method: paymentMethod,
                kind: "COLLECTED",
                refType: "SHOP_ORDER",
                refId: order.id,
                createdAt: new Date(),
              },
            });
          }

          return order;
        },
        {
          maxWait: 10000,
          timeout: 20000,
        }
      );
    };

    // Retry once automatically on transient DB connection errors only
    let orderResult;
    try {
      orderResult = await executeWriteTx();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isConnError =
        msg.includes("connection") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("timeout") ||
        msg.includes("timed out") ||
        msg.includes("timeout exceeded when trying to connect");

      if (isConnError) {
        console.warn("[placeOrder] DB connection timeout, retrying once automatically:", msg);
        orderResult = await executeWriteTx();
      } else {
        throw err;
      }
    }

    // Cache completed order for idempotency
    if (input.clientRequestId && orderResult) {
      idempotencyCache.set(input.clientRequestId, {
        order: orderResult,
        timestamp: Date.now(),
      });
    }

    return { success: true, order: orderResult };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Payment did not go through. Please try again.";
    console.error("[placeOrder error]:", errorMsg);
    return {
      success: false,
      error: errorMsg.includes("Insufficient stock") ? errorMsg : "Payment did not go through. Please try again.",
    };
  }
}

/**
 * Returns paginated shop products with search and category filters.
 * 9 products per page (3x3 grid).
 */
export async function getShopProductsPaginated(params: {
  page?: number;
  limit?: number;
  query?: string;
  category?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = params.limit || 9;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    archivedAt: null,
    ...(params.query
      ? {
          OR: [
            { name: { contains: params.query.trim(), mode: "insensitive" } },
            { category: { contains: params.query.trim(), mode: "insensitive" } },
            { sku: { contains: params.query.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params.category && params.category !== "ALL"
      ? { category: { equals: params.category, mode: "insensitive" } }
      : {}),
  };

  const [products, total, allCategories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where: { archivedAt: null },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      sku: p.sku || "",
      name: p.name,
      category: p.category,
      price: Number(p.price),
      costPrice: Number(p.costPrice || 0),
      stockQty: p.stockQty,
      reorderLevel: p.reorderLevel,
      isLowStock: p.stockQty <= p.reorderLevel,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    categories: Array.from(new Set(allCategories.map((c) => c.category))).sort(),
  };
}

/**
 * Returns court gear-up queue: confirmed bookings today needing equipment for court delivery.
 */
export async function getCourtGearUpQueue() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      startsAt: { gte: startOfDay, lte: endOfDay },
      status: "CONFIRMED",
    },
    include: {
      court: true,
      member: {
        include: {
          user: true,
          shopOrders: {
            where: {
              status: "PENDING",
              fulfilment: "PICKUP",
            },
            include: {
              items: { include: { product: true } },
            },
          },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  return bookings
    .filter((b) => b.member?.shopOrders && b.member.shopOrders.length > 0)
    .map((b) => ({
      bookingId: b.id,
      courtName: b.court.name,
      startsAt: b.startsAt,
      playerName: b.member?.user?.name || `Member ${b.member?.membershipNo}`,
      neededOrders: b.member!.shopOrders.map((o) => ({
        orderId: o.id,
        items: o.items.map((i) => `${i.product.name} (x${i.quantity})`).join(", "),
        totalAmount: Number(o.totalAmount),
      })),
    }));
}

/**
 * Quick court gear-up items (Balls, Grips, Strings, Towels) for fast court booking checkout
 */
export async function getGearUpItems() {
  return await prisma.product.findMany({
    where: {
      category: { in: ["Balls", "Accessories", "Strings"] },
      stockQty: { gt: 0 },
      archivedAt: null,
    },
    take: 6,
    orderBy: { stockQty: "desc" },
  });
}

/**
 * Restocks a product (legacy helper; forward to inventory or update stock)
 */
export async function restockProduct(data: {
  productId: string;
  addQty: number;
  staffUserId: string;
}) {
  if (data.addQty <= 0) {
    return { success: false, error: "Restock quantity must be greater than zero." };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const product = await tx.product.update({
          where: { id: data.productId },
          data: {
            stockQty: { increment: data.addQty },
          },
        });

        const smId = 'c_sm_r_' + Math.random().toString(36).substring(2, 12);
        await tx.$executeRaw`
          INSERT INTO "StockMovement" ("id", "itemType", "itemId", "type", "quantityChange", "unitCost", "note", "createdById", "createdAt")
          VALUES (${smId}, 'PRODUCT', ${data.productId}, 'PURCHASE', ${data.addQty}, ${product.costPrice || 0}, 'Product restock', ${data.staffUserId}, NOW())
        `;

        return product;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return { success: true, product: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to restock product.",
    };
  }
}

/**
 * Updates order status (e.g. PENDING -> COMPLETED or CANCELLED)
 */
export async function updateOrderStatus(data: {
  orderId: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  staffUserId?: string;
}) {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const order = await tx.shopOrder.findUniqueOrThrow({
          where: { id: data.orderId },
          include: { items: true },
        });

        if (data.status === "CANCELLED" && order.status !== "CANCELLED") {
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stockQty: { increment: item.quantity } },
            });

            const smId = 'c_sm_c_' + Math.random().toString(36).substring(2, 12);
            await tx.$executeRaw`
              INSERT INTO "StockMovement" ("id", "itemType", "itemId", "type", "quantityChange", "unitCost", "note", "createdAt")
              VALUES (${smId}, 'PRODUCT', ${item.productId}, 'RETURN', ${item.quantity}, 0, 'Order cancelled restock', NOW())
            `;
          }

          await tx.ledgerEntry.create({
            data: {
              source: "SHOP",
              amount: order.totalAmount,
              method: order.paymentMethod,
              kind: "REFUNDED",
              refType: "SHOP_ORDER",
              refId: order.id,
              createdAt: new Date(),
            },
          });
        }

        const updated = await tx.shopOrder.update({
          where: { id: data.orderId },
          data: { status: data.status },
          include: { items: { include: { product: true } }, member: { include: { user: true } } },
        });

        return updated;
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    return { success: true, order: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update order status.",
    };
  }
}
