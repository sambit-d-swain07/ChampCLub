"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Normalizes category to Title Case (e.g. "rackets" -> "Rackets", "RACKETS" -> "Rackets")
function normalizeCategory(cat: string): string {
  const trimmed = cat.trim();
  if (!trimmed) return "General";
  return trimmed
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const addItemSchema = z.object({
  itemType: z.enum(["PRODUCT", "BAR"]),
  name: z.string().min(1, "Item name is required").max(100),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  costPrice: z.coerce.number().min(0, "Cost price must be non-negative").default(0),
  openingStock: z.coerce.number().int().min(0, "Opening stock cannot be negative").default(0),
  reorderLevel: z.coerce.number().int().min(0, "Reorder level cannot be negative").default(5),
});

const editItemSchema = z.object({
  itemType: z.enum(["PRODUCT", "BAR"]),
  itemId: z.string().min(1, "Item ID is required"),
  name: z.string().min(1, "Item name is required").max(100),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  costPrice: z.coerce.number().min(0, "Cost price must be non-negative").default(0),
  reorderLevel: z.coerce.number().int().min(0, "Reorder level cannot be negative").default(5),
});

const restockSchema = z.object({
  itemType: z.enum(["PRODUCT", "BAR"]),
  itemId: z.string().min(1, "Item ID is required"),
  quantity: z.coerce.number().int().positive("Restock quantity must be positive"),
  unitCost: z.coerce.number().min(0, "Unit cost must be non-negative").default(0),
  supplier: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const adjustSchema = z.object({
  itemType: z.enum(["PRODUCT", "BAR"]),
  itemId: z.string().min(1, "Item ID is required"),
  newCount: z.coerce.number().int().min(0, "Stock count cannot be negative"),
  reason: z.enum(["Damage", "Loss", "Count correction"]),
  note: z.string().optional().nullable(),
});

/**
 * Adds a new Product or BarItem with auto-generated SKU and optional opening stock.
 */
export async function addItemAction(data: z.infer<typeof addItemSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Authentication required." };
    }

    const parsed = addItemSchema.parse(data);
    const category = normalizeCategory(parsed.category);

    const result = await prisma.$transaction(
      async (tx) => {
        let sku = "";
        let newItemId = "";

        if (parsed.itemType === "PRODUCT") {
          const count = await tx.product.count();
          sku = `PS-${String(count + 1).padStart(4, "0")}`;

          const created = await tx.product.create({
            data: {
              sku,
              name: parsed.name.trim(),
              category,
              price: parsed.price,
              costPrice: parsed.costPrice,
              stockQty: parsed.openingStock,
              reorderLevel: parsed.reorderLevel,
            },
          });
          newItemId = created.id;
        } else {
          const count = await tx.barItem.count();
          sku = `BR-${String(count + 1).padStart(4, "0")}`;

          const created = await tx.barItem.create({
            data: {
              sku,
              name: parsed.name.trim(),
              category,
              price: parsed.price,
              costPrice: parsed.costPrice,
              stockQty: parsed.openingStock,
              reorderLevel: parsed.reorderLevel,
            },
          });
          newItemId = created.id;
        }

        // Record opening stock movement if stock > 0
        if (parsed.openingStock > 0) {
          const smId = "c_sm_o_" + Math.random().toString(36).substring(2, 12);
          await tx.$executeRaw`
            INSERT INTO "StockMovement" ("id", "itemType", "itemId", "type", "quantityChange", "unitCost", "note", "createdById", "createdAt")
            VALUES (${smId}, ${parsed.itemType}::"StockItemType", ${newItemId}, 'OPENING', ${parsed.openingStock}, ${parsed.costPrice}, 'Opening inventory count', ${user.id}, NOW())
          `;
        }

        return { id: newItemId, sku };
      },
      { maxWait: 10000, timeout: 20000 }
    );

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/shop");
    revalidatePath("/admin/bar");
    revalidatePath("/member/shop");

    return { success: true, ...result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add inventory item.",
    };
  }
}

/**
 * Edits an existing Product or BarItem (name, category, price, cost, reorder level).
 */
export async function editItemAction(data: z.infer<typeof editItemSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Authentication required." };
    }

    const parsed = editItemSchema.parse(data);
    const category = normalizeCategory(parsed.category);

    if (parsed.itemType === "PRODUCT") {
      await prisma.product.update({
        where: { id: parsed.itemId },
        data: {
          name: parsed.name.trim(),
          category,
          price: parsed.price,
          costPrice: parsed.costPrice,
          reorderLevel: parsed.reorderLevel,
        },
      });
    } else {
      await prisma.barItem.update({
        where: { id: parsed.itemId },
        data: {
          name: parsed.name.trim(),
          category,
          price: parsed.price,
          costPrice: parsed.costPrice,
          reorderLevel: parsed.reorderLevel,
        },
      });
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/shop");
    revalidatePath("/admin/bar");
    revalidatePath("/member/shop");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to edit inventory item.",
    };
  }
}

/**
 * Restocks an item: increments stockQty, records StockMovement, and creates an Expense if unitCost > 0.
 */
export async function restockItemAction(data: z.infer<typeof restockSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Authentication required." };
    }

    const parsed = restockSchema.parse(data);

    await prisma.$transaction(
      async (tx) => {
        let itemName = "";

        if (parsed.itemType === "PRODUCT") {
          const item = await tx.product.update({
            where: { id: parsed.itemId },
            data: {
              stockQty: { increment: parsed.quantity },
              ...(parsed.unitCost > 0 ? { costPrice: parsed.unitCost } : {}),
            },
          });
          itemName = item.name;
        } else {
          const item = await tx.barItem.update({
            where: { id: parsed.itemId },
            data: {
              stockQty: { increment: parsed.quantity },
              ...(parsed.unitCost > 0 ? { costPrice: parsed.unitCost } : {}),
            },
          });
          itemName = item.name;
        }

        // Record StockMovement row
        const smId = "c_sm_p_" + Math.random().toString(36).substring(2, 12);
        await tx.$executeRaw`
          INSERT INTO "StockMovement" ("id", "itemType", "itemId", "type", "quantityChange", "unitCost", "supplier", "note", "createdById", "createdAt")
          VALUES (${smId}, ${parsed.itemType}::"StockItemType", ${parsed.itemId}, 'PURCHASE', ${parsed.quantity}, ${parsed.unitCost}, ${parsed.supplier || null}, ${parsed.note || null}, ${user.id}, NOW())
        `;

        // Create Expense if unitCost > 0 so Executive Finance stays correct
        if (parsed.unitCost > 0) {
          const totalExpense = parsed.quantity * parsed.unitCost;
          await tx.expense.create({
            data: {
              title: `Inventory Restock: ${itemName} (${parsed.quantity} units)`,
              category: "Inventory",
              amount: totalExpense,
              notes: parsed.supplier ? `Supplier: ${parsed.supplier}. ${parsed.note || ""}`.trim() : parsed.note || null,
              recordedBy: user.name || user.email,
              date: new Date(),
            },
          });
        }
      },
      { maxWait: 10000, timeout: 20000 }
    );

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/shop");
    revalidatePath("/admin/bar");
    revalidatePath("/admin/owner");
    revalidatePath("/admin/expenses");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to restock item.",
    };
  }
}

/**
 * Bulk restock selected items (used on Low Stock view).
 */
export async function bulkRestockAction(
  items: Array<{
    itemType: "PRODUCT" | "BAR";
    itemId: string;
    quantity: number;
    unitCost: number;
    supplier?: string;
  }>
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Authentication required." };
    }

    if (!items || items.length === 0) {
      return { success: false, error: "No items selected to restock." };
    }

    await prisma.$transaction(
      async (tx) => {
        for (const item of items) {
          if (item.quantity <= 0) continue;
          let itemName = "";

          if (item.itemType === "PRODUCT") {
            const p = await tx.product.update({
              where: { id: item.itemId },
              data: {
                stockQty: { increment: item.quantity },
                ...(item.unitCost > 0 ? { costPrice: item.unitCost } : {}),
              },
            });
            itemName = p.name;
          } else {
            const b = await tx.barItem.update({
              where: { id: item.itemId },
              data: {
                stockQty: { increment: item.quantity },
                ...(item.unitCost > 0 ? { costPrice: item.unitCost } : {}),
              },
            });
            itemName = b.name;
          }

          const smId = "c_sm_b_" + Math.random().toString(36).substring(2, 12);
          await tx.$executeRaw`
            INSERT INTO "StockMovement" ("id", "itemType", "itemId", "type", "quantityChange", "unitCost", "supplier", "note", "createdById", "createdAt")
            VALUES (${smId}, ${item.itemType}::"StockItemType", ${item.itemId}, 'PURCHASE', ${item.quantity}, ${item.unitCost}, ${item.supplier || null}, 'Bulk Restock', ${user.id}, NOW())
          `;

          if (item.unitCost > 0) {
            const totalExpense = item.quantity * item.unitCost;
            await tx.expense.create({
              data: {
                title: `Inventory Restock: ${itemName} (${item.quantity} units)`,
                category: "Inventory",
                amount: totalExpense,
                notes: item.supplier ? `Supplier: ${item.supplier}` : null,
                recordedBy: user.name || user.email,
                date: new Date(),
              },
            });
          }
        }
      },
      { maxWait: 10000, timeout: 20000 }
    );

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/shop");
    revalidatePath("/admin/bar");
    revalidatePath("/admin/owner");
    revalidatePath("/admin/expenses");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to execute bulk restock.",
    };
  }
}

/**
 * Adjusts inventory stock: computes delta, updates stockQty without going negative, records StockMovement.
 */
export async function adjustStockAction(data: z.infer<typeof adjustSchema>) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Authentication required." };
    }

    const parsed = adjustSchema.parse(data);

    await prisma.$transaction(
      async (tx) => {
        let currentStock = 0;
        let costPrice = 0;

        if (parsed.itemType === "PRODUCT") {
          const item = await tx.product.findUniqueOrThrow({ where: { id: parsed.itemId } });
          currentStock = item.stockQty;
          costPrice = Number(item.costPrice || 0);
          await tx.product.update({
            where: { id: parsed.itemId },
            data: { stockQty: parsed.newCount },
          });
        } else {
          const item = await tx.barItem.findUniqueOrThrow({ where: { id: parsed.itemId } });
          currentStock = item.stockQty;
          costPrice = Number(item.costPrice || 0);
          await tx.barItem.update({
            where: { id: parsed.itemId },
            data: { stockQty: parsed.newCount },
          });
        }

        const delta = parsed.newCount - currentStock;
        const movementType = parsed.reason === "Damage" ? "DAMAGE" : "ADJUSTMENT";
        const note = `Reason: ${parsed.reason}${parsed.note ? ` - ${parsed.note}` : ""}`;

        const smId = "c_sm_a_" + Math.random().toString(36).substring(2, 12);
        await tx.$executeRaw`
          INSERT INTO "StockMovement" ("id", "itemType", "itemId", "type", "quantityChange", "unitCost", "note", "createdById", "createdAt")
          VALUES (${smId}, ${parsed.itemType}::"StockItemType", ${parsed.itemId}, ${movementType}::"StockMovementType", ${delta}, ${costPrice}, ${note}, ${user.id}, NOW())
        `;
      },
      { maxWait: 10000, timeout: 20000 }
    );

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/shop");
    revalidatePath("/admin/bar");
    revalidatePath("/member/shop");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to adjust stock count.",
    };
  }
}

/**
 * Soft deletes / archives an item. OWNER ONLY!
 */
export async function archiveItemAction(data: { itemType: "PRODUCT" | "BAR"; itemId: string }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "OWNER") {
      return { success: false, error: "Only the club owner can archive inventory items." };
    }

    if (data.itemType === "PRODUCT") {
      await prisma.product.update({
        where: { id: data.itemId },
        data: { archivedAt: new Date() },
      });
    } else {
      await prisma.barItem.update({
        where: { id: data.itemId },
        data: { archivedAt: new Date() },
      });
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/admin/shop");
    revalidatePath("/admin/bar");
    revalidatePath("/member/shop");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to archive item.",
    };
  }
}

/**
 * Fetches item detail drawer data: stock history (paginated) and units sold in last 30 days.
 */
export async function getItemHistoryAction(data: {
  itemType: "PRODUCT" | "BAR";
  itemId: string;
  page?: number;
}) {
  try {
    const page = Math.max(1, data.page || 1);
    const take = 10;
    const skip = (page - 1) * take;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [movements, totalMovements, unitsSoldAgg] = await Promise.all([
      prisma.stockMovement.findMany({
        where: {
          itemType: data.itemType,
          itemId: data.itemId,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.stockMovement.count({
        where: {
          itemType: data.itemType,
          itemId: data.itemId,
        },
      }),
      prisma.stockMovement.aggregate({
        where: {
          itemType: data.itemType,
          itemId: data.itemId,
          type: "SALE",
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: {
          quantityChange: true,
        },
      }),
    ]);

    const unitsSold30d = Math.abs(unitsSoldAgg._sum.quantityChange || 0);

    return {
      success: true,
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        quantityChange: m.quantityChange,
        unitCost: m.unitCost ? Number(m.unitCost) : null,
        note: m.note,
        supplier: m.supplier,
        createdAt: m.createdAt.toISOString(),
      })),
      totalMovements,
      page,
      totalPages: Math.max(1, Math.ceil(totalMovements / take)),
      unitsSold30d,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch stock history.",
    };
  }
}
