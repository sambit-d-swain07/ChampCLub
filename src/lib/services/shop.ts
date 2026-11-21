import { prisma } from "@/lib/prisma";
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
}

/**
 * Places a shop order inside a single transaction.
 * Both COUNTER and ONLINE use this exact function.
 *
 * For each item line:
 * Runs atomic: UPDATE "Product" SET "stockQty" = "stockQty" - n WHERE "id" = ? AND "stockQty" >= n
 * Fails the entire order if any row fails to update (stock insufficient).
 * Snapshots price and discount per line.
 * Writes SHOP ledger entries (EARNED and COLLECTED).
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

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Resolve member discount from entitlement engine
        let discountPct = 0;
        if (input.memberId) {
          const ent = await resolve(input.memberId, new Date());
          discountPct = ent.shopDiscountPct;
        }

        // 2. Fetch all products to verify existence & price
        const productIds = input.items.map((i) => i.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        if (products.length !== productIds.length) {
          throw new Error("One or more selected products no longer exist.");
        }

        const productMap = new Map(products.map((p) => [p.id, p]));

        // 3. Atomically decrement stock for EACH item
        // UPDATE "Product" SET "stockQty" = "stockQty" - n WHERE "id" = ? AND "stockQty" >= n
        const lineItemsData: Array<{
          productId: string;
          quantity: number;
          priceSnapshot: number;
          discountSnapshot: number;
          lineTotal: number;
        }> = [];

        let totalOrderAmount = 0;

        for (const item of input.items) {
          const product = productMap.get(item.productId)!;

          // Atomic stock decrement
          const updateCount = await tx.$executeRaw`
            UPDATE "Product"
            SET "stockQty" = "stockQty" - ${item.quantity},
                "updatedAt" = NOW()
            WHERE "id" = ${item.productId}
              AND "stockQty" >= ${item.quantity}
          `;

          if (updateCount === 0) {
            // Failed atomic check: insufficient stock!
            throw new Error(
              `Insufficient stock for "${product.name}". Available stock is less than requested quantity (${item.quantity}).`
            );
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
          });
        }

        // 4. Create ShopOrder and ShopOrderItems
        const isCounter = input.channel === "COUNTER";
        const orderStatus = isCounter ? "COMPLETED" : "PENDING";
        const fulfilment = input.fulfilment || (isCounter ? "PICKUP" : "PICKUP");

        const order = await tx.shopOrder.create({
          data: {
            memberId: input.memberId || null,
            channel: input.channel,
            fulfilment,
            status: orderStatus,
            totalAmount: totalOrderAmount,
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

        // 5. Write SHOP Ledger Entries
        const paymentMethod = input.paymentMethod || (isCounter ? "CASH" : "ONLINE");

        // EARNED
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

        // COLLECTED (counter sale or online payment)
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

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      }
    );

    return { success: true, order: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to place order.",
    };
  }
}

/**
 * Restocks a product by adding quantity.
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
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: data.productId },
        data: {
          stockQty: { increment: data.addQty },
        },
      });

      return product;
    });

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
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.findUniqueOrThrow({
        where: { id: data.orderId },
        include: { items: true },
      });

      // If cancelling an order, restore product stock
      if (data.status === "CANCELLED" && order.status !== "CANCELLED") {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { increment: item.quantity } },
          });
        }

        // Record refund in ledger
        await tx.ledgerEntry.create({
          data: {
            source: "SHOP",
            amount: order.totalAmount,
            method: "ONLINE",
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
    });

    return { success: true, order: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update order status.",
    };
  }
}

/**
 * Returns inventory list with low-stock status and days-left estimate based on last 14 days sales.
 */
export async function getShopInventory() {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [products, recentSales] = await Promise.all([
    prisma.product.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    prisma.shopOrderItem.groupBy({
      by: ["productId"],
      where: {
        createdAt: { gte: fourteenDaysAgo },
        order: { status: { in: ["COMPLETED", "PENDING"] } },
      },
      _sum: {
        quantity: true,
      },
    }),
  ]);

  const salesMap = new Map(recentSales.map((s) => [s.productId, s._sum.quantity || 0]));

  return products.map((p) => {
    const soldLast14d = salesMap.get(p.id) || 0;
    const dailyVelocity = soldLast14d / 14;
    const daysLeft = dailyVelocity > 0 ? Math.round(p.stockQty / dailyVelocity) : null;
    const isLowStock = p.stockQty <= p.reorderLevel;

    return {
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      stockQty: p.stockQty,
      reorderLevel: p.reorderLevel,
      isLowStock,
      soldLast14d,
      daysLeft,
    };
  });
}

/**
 * Returns court gear-up queue: confirmed bookings today needing equipment for court delivery.
 */
export async function getCourtGearUpQueue() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Confirmed bookings today
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
    },
    take: 6,
    orderBy: { stockQty: "desc" },
  });
}
