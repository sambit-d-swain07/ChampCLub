import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { BarOrderStatus, PaymentMethod } from "@prisma/client";

/**
 * Ensures baseline Bar Tables and Bar Menu Items exist in DB.
 */
export async function ensureBarSeedData() {
  const [tablesCount, itemsCount] = await Promise.all([
    prisma.barTable.count(),
    prisma.barItem.count(),
  ]);

  if (tablesCount === 0) {
    await prisma.barTable.createMany({
      data: [
        { name: "Table 1 (Courtside)", capacity: 4 },
        { name: "Table 2 (Courtside)", capacity: 4 },
        { name: "Table 3 (Terrace Lounge)", capacity: 6 },
        { name: "Table 4 (Terrace Lounge)", capacity: 6 },
        { name: "Table 5 (High Top)", capacity: 2 },
        { name: "Table 6 (High Top)", capacity: 2 },
        { name: "Table 7 (VIP Booth)", capacity: 8 },
        { name: "Table 8 (Bar Counter)", capacity: 4 },
      ],
    });
  }

  if (itemsCount === 0) {
    await prisma.barItem.createMany({
      data: [
        { name: "Fresh Lime Soda", category: "Beverages", price: 120, stockQty: 100, reorderLevel: 20 },
        { name: "Cold Brew Coffee", category: "Beverages", price: 220, stockQty: 80, reorderLevel: 15 },
        { name: "Whey Protein Shake", category: "Health & Fitness", price: 350, stockQty: 60, reorderLevel: 10 },
        { name: "Electrolyte Hydration Drink", category: "Beverages", price: 150, stockQty: 120, reorderLevel: 25 },
        { name: "Club Chicken Sandwich", category: "Snacks", price: 380, stockQty: 50, reorderLevel: 10 },
        { name: "Avocado Sourdough Toast", category: "Snacks", price: 420, stockQty: 40, reorderLevel: 10 },
        { name: "Grilled Paneer Tikka Wrap", category: "Snacks", price: 320, stockQty: 50, reorderLevel: 10 },
        { name: "Caesar Salad with Chicken", category: "Mains", price: 460, stockQty: 35, reorderLevel: 8 },
        { name: "Artisanal Craft Beer (Draft)", category: "Draft & Alcohol", price: 450, stockQty: 75, reorderLevel: 20 },
        { name: "Classic Margherita Pizza", category: "Mains", price: 520, stockQty: 40, reorderLevel: 10 },
      ],
    });
  }
}

/**
 * Returns all bar tables and calculates whether they are free or occupied with an active tab.
 */
export async function getTablesWithActiveTabs() {
  await ensureBarSeedData();

  const tables = await prisma.barTable.findMany({
    orderBy: { name: "asc" },
    include: {
      tabs: {
        where: { status: "OPEN" },
        include: {
          member: { include: { user: true } },
          orders: {
            include: {
              items: { include: { barItem: true } },
            },
          },
        },
        take: 1,
      },
    },
  });

  // Fetch collected payments for active open tabs
  const openTabIds = tables
    .map((t) => t.tabs[0]?.id)
    .filter(Boolean) as string[];

  const payments = openTabIds.length > 0
    ? await prisma.ledgerEntry.findMany({
        where: {
          source: "BAR",
          kind: "COLLECTED",
          refType: "TAB",
          refId: { in: openTabIds },
        },
      })
    : [];

  const paymentMap = new Map<string, number>();
  for (const p of payments) {
    paymentMap.set(p.refId, (paymentMap.get(p.refId) || 0) + Number(p.amount));
  }

  return tables.map((table) => {
    const activeTab = table.tabs[0] || null;

    if (!activeTab) {
      return {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        isOccupied: false,
        activeTab: null,
      };
    }

    const totalLinesAmount = Number(activeTab.totalAmount);
    const totalCollected = paymentMap.get(activeTab.id) || 0;
    const balance = Math.max(0, totalLinesAmount - totalCollected);

    return {
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      isOccupied: true,
      activeTab: {
        id: activeTab.id,
        guestName: activeTab.guestName,
        memberName: activeTab.member?.user?.name || (activeTab.member ? `Member ${activeTab.member.membershipNo}` : null),
        memberId: activeTab.memberId,
        openedAt: activeTab.openedAt.toISOString(),
        totalAmount: totalLinesAmount,
        totalPaid: totalCollected,
        balance,
        orders: activeTab.orders.map((o) => ({
          id: o.id,
          status: o.status,
          personLabel: o.personLabel || "Guest",
          totalAmount: Number(o.totalAmount),
          createdAt: o.createdAt.toISOString(),
          items: o.items.map((i) => ({
            id: i.id,
            name: i.barItem.name,
            quantity: i.quantity,
            price: Number(i.priceSnapshot) - Number(i.discountSnapshot),
            basePrice: Number(i.priceSnapshot),
            discount: Number(i.discountSnapshot),
          })),
        })),
      },
    };
  });
}

/**
 * Returns bar menu items.
 */
export async function getBarMenuItems() {
  await ensureBarSeedData();
  const items = await prisma.barItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return items.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    price: Number(i.price),
    stockQty: i.stockQty,
    reorderLevel: i.reorderLevel,
  }));
}

/**
 * Opens a new Tab for a table or member.
 */
export async function openTab(input: {
  tableId?: string | null;
  memberId?: string | null;
  guestName?: string | null;
  staffUserId?: string;
}) {
  if (!input.tableId && !input.memberId && !input.guestName) {
    return { success: false, error: "Must specify a table, member, or guest name to open a tab." };
  }

  // Ensure table is not already occupied by an open tab
  if (input.tableId) {
    const existing = await prisma.tab.findFirst({
      where: { tableId: input.tableId, status: "OPEN" },
    });
    if (existing) {
      return { success: false, error: "This table already has an active open tab." };
    }
  }

  const tab = await prisma.tab.create({
    data: {
      tableId: input.tableId || null,
      memberId: input.memberId || null,
      guestName: input.guestName || null,
      status: "OPEN",
      totalAmount: 0,
    },
    include: {
      table: true,
      member: { include: { user: true } },
    },
  });

  return { success: true, tab };
}

/**
 * Adds an order with person label to an active tab.
 * Automatically resolves member discount from entitlement engine and snapshots it.
 */
export async function addOrderToTab(input: {
  tabId: string;
  personLabel?: string | null;
  items: Array<{ barItemId: string; quantity: number }>;
  staffUserId?: string;
}) {
  if (!input.items || input.items.length === 0) {
    return { success: false, error: "Order must contain at least one item." };
  }

  try {
    const tab = await prisma.tab.findUniqueOrThrow({
      where: { id: input.tabId },
    });

    if (tab.status !== "OPEN") {
      throw new Error("Cannot add items to a closed tab.");
    }

    // Resolve member discount before transaction to minimize transaction duration
    let discountPct = 0;
    if (tab.memberId) {
      const ent = await resolve(tab.memberId, new Date());
      discountPct = ent.barDiscountPct;
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // Fetch items
        const itemIds = input.items.map((i) => i.barItemId);
        const barItems = await tx.barItem.findMany({
          where: { id: { in: itemIds } },
        });
        const itemMap = new Map(barItems.map((b) => [b.id, b]));

        let orderTotal = 0;
        const orderItemsData: Array<{
          barItemId: string;
          quantity: number;
          priceSnapshot: number;
          discountSnapshot: number;
        }> = [];

        for (const reqItem of input.items) {
          const product = itemMap.get(reqItem.barItemId);
          if (!product) {
            throw new Error("Item not found on bar menu.");
          }

          // Deduct stock
          const updated = await tx.barItem.updateMany({
            where: {
              id: reqItem.barItemId,
              stockQty: { gte: reqItem.quantity },
            },
            data: {
              stockQty: { decrement: reqItem.quantity },
            },
          });

          if (updated.count === 0) {
            throw new Error(`Insufficient stock for "${product.name}".`);
          }

          const basePrice = Number(product.price);
          const itemDiscount = (basePrice * discountPct) / 100;
          const netPrice = Math.max(0, basePrice - itemDiscount);
          orderTotal += netPrice * reqItem.quantity;

          orderItemsData.push({
            barItemId: reqItem.barItemId,
            quantity: reqItem.quantity,
            priceSnapshot: basePrice,
            discountSnapshot: itemDiscount,
          });
        }

        // Create BarOrder
        const order = await tx.barOrder.create({
          data: {
            tabId: input.tabId,
            status: "NEW",
            personLabel: input.personLabel || "Guest",
            totalAmount: orderTotal,
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: { include: { barItem: true } },
          },
        });

        // Update Tab totalAmount
        await tx.tab.update({
          where: { id: input.tabId },
          data: {
            totalAmount: { increment: orderTotal },
          },
        });

        return order;
      },
      { timeout: 15000, maxWait: 10000 }
    );

    return { success: true, order: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add items to tab.",
    };
  }
}

/**
 * Updates bar order status on kitchen board.
 * When status transitions to SERVED: writes a BAR ledger entry as EARNED.
 */
export async function updateBarOrderStatus(
  orderId: string,
  newStatus: BarOrderStatus,
  staffUserId?: string
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.barOrder.findUniqueOrThrow({
        where: { id: orderId },
        include: { tab: true },
      });

      if (order.status === newStatus) return order;

      const updated = await tx.barOrder.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      // Crucial Rule: When items are SERVED, write BAR ledger entry as EARNED
      if (newStatus === "SERVED" && order.status !== "SERVED") {
        await tx.ledgerEntry.create({
          data: {
            source: "BAR",
            kind: "EARNED",
            amount: order.totalAmount,
            method: "ONLINE", // Standard reference for EARNED revenue recognition
            refType: "BAR_ORDER",
            refId: order.id,
            createdAt: new Date(),
          },
        });
      }

      // If CANCELLED, restore stock and decrement tab total
      if (newStatus === "CANCELLED" && order.status !== "CANCELLED") {
        const items = await tx.barOrderItem.findMany({
          where: { orderId },
        });
        for (const item of items) {
          await tx.barItem.update({
            where: { id: item.barItemId },
            data: { stockQty: { increment: item.quantity } },
          });
        }
        await tx.tab.update({
          where: { id: order.tabId },
          data: { totalAmount: { decrement: order.totalAmount } },
        });
      }

      return updated;
    }, { timeout: 15000, maxWait: 10000 });

    return { success: true, order: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update order status.",
    };
  }
}

/**
 * Returns active orders for Kitchen Board:
 * NEW, PREPARING, READY, and recent SERVED orders.
 */
export async function getKitchenOrders() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const orders = await prisma.barOrder.findMany({
    where: {
      OR: [
        { status: { in: ["NEW", "PREPARING", "READY"] } },
        { status: "SERVED", updatedAt: { gte: tenMinutesAgo } },
      ],
    },
    include: {
      tab: {
        include: {
          table: true,
          member: { include: { user: true } },
        },
      },
      items: {
        include: { barItem: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = Date.now();

  return orders.map((o) => {
    const ageMinutes = Math.floor((now - o.createdAt.getTime()) / 60000);
    const isOverdue = ageMinutes >= 10 && o.status !== "SERVED";

    return {
      id: o.id,
      tabId: o.tabId,
      status: o.status,
      personLabel: o.personLabel || "Guest",
      tableName: o.tab.table?.name || "Lounge Tab",
      customerName: o.tab.member?.user?.name || o.tab.guestName || "Guest",
      createdAt: o.createdAt.toISOString(),
      ageMinutes,
      isOverdue,
      totalAmount: Number(o.totalAmount),
      items: o.items.map((i) => ({
        id: i.id,
        name: i.barItem.name,
        quantity: i.quantity,
      })),
    };
  });
}

export interface SplitPaymentInput {
  method: PaymentMethod;
  amount: number;
  personLabel?: string;
}

/**
 * Pays a tab with support for split payments (multiple payment methods / amounts / persons).
 * Writes BAR ledger entries as COLLECTED for each payment.
 * Automatically marks tab as CLOSED when balance reaches 0.
 */
export async function payTab(input: {
  tabId: string;
  payments: SplitPaymentInput[];
  staffUserId?: string;
}) {
  if (!input.payments || input.payments.length === 0) {
    return { success: false, error: "Must specify at least one payment line." };
  }

  const totalPaying = input.payments.reduce((acc, p) => acc + p.amount, 0);
  if (totalPaying <= 0) {
    return { success: false, error: "Total payment amount must be greater than zero." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tab = await tx.tab.findUniqueOrThrow({
        where: { id: input.tabId },
      });

      if (tab.status !== "OPEN") {
        throw new Error("This tab is already settled and closed.");
      }

      // Check existing collected payments
      const existingPayments = await tx.ledgerEntry.findMany({
        where: {
          source: "BAR",
          kind: "COLLECTED",
          refType: "TAB",
          refId: input.tabId,
        },
      });

      const previouslyCollected = existingPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      const tabTotal = Number(tab.totalAmount);
      const newTotalPaid = previouslyCollected + totalPaying;
      const remainingBalance = Math.max(0, tabTotal - newTotalPaid);

      // Create a COLLECTED ledger entry for each payment method in the split
      for (const payment of input.payments) {
        if (payment.amount > 0) {
          await tx.ledgerEntry.create({
            data: {
              source: "BAR",
              kind: "COLLECTED",
              amount: payment.amount,
              method: payment.method,
              refType: "TAB",
              refId: input.tabId,
              createdAt: new Date(),
            },
          });
        }
      }

      // If fully paid, close the tab
      let isClosed = false;
      if (remainingBalance <= 0.01) {
        await tx.tab.update({
          where: { id: input.tabId },
          data: {
            status: "CLOSED",
            closedAt: new Date(),
          },
        });
        isClosed = true;
      }

      return {
        tabId: input.tabId,
        isClosed,
        totalPaidNow: totalPaying,
        remainingBalance,
      };
    }, { timeout: 15000, maxWait: 10000 });

    return { success: true, ...result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process tab payment.",
    };
  }
}

/**
 * Computes shift close report for the logged-in staff member.
 * Shows earned total, collected breakdown by method, and still-open tabs total.
 */
export async function getShiftCloseReport(staffUserId?: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 1. Earned BAR revenue today
  const earnedEntries = await prisma.ledgerEntry.findMany({
    where: {
      source: "BAR",
      kind: "EARNED",
      createdAt: { gte: todayStart },
    },
  });
  const earnedTotal = earnedEntries.reduce((acc, e) => acc + Number(e.amount), 0);

  // 2. Collected BAR revenue today
  const collectedEntries = await prisma.ledgerEntry.findMany({
    where: {
      source: "BAR",
      kind: "COLLECTED",
      createdAt: { gte: todayStart },
    },
  });

  const collectedByMethod: Record<PaymentMethod, number> = {
    CASH: 0,
    CARD: 0,
    UPI: 0,
    ONLINE: 0,
  };

  let totalCollected = 0;
  for (const c of collectedEntries) {
    const amt = Number(c.amount);
    collectedByMethod[c.method] = (collectedByMethod[c.method] || 0) + amt;
    totalCollected += amt;
  }

  // 3. Outstanding still-open tabs
  const openTabs = await prisma.tab.findMany({
    where: { status: "OPEN" },
  });

  const openTabIds = openTabs.map((t) => t.id);
  const openTabPayments = openTabIds.length > 0
    ? await prisma.ledgerEntry.findMany({
        where: {
          source: "BAR",
          kind: "COLLECTED",
          refType: "TAB",
          refId: { in: openTabIds },
        },
      })
    : [];

  const openPaymentsMap = new Map<string, number>();
  for (const p of openTabPayments) {
    openPaymentsMap.set(p.refId, (openPaymentsMap.get(p.refId) || 0) + Number(p.amount));
  }

  let stillOpenTabsTotal = 0;
  for (const tab of openTabs) {
    const totalLines = Number(tab.totalAmount);
    const paid = openPaymentsMap.get(tab.id) || 0;
    stillOpenTabsTotal += Math.max(0, totalLines - paid);
  }

  // Staff details
  let staffName = "Staff Member";
  if (staffUserId) {
    const user = await prisma.user.findUnique({ where: { id: staffUserId } });
    if (user) staffName = user.name;
  }

  return {
    shiftDate: new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    staffName,
    earnedTotal,
    collectedByMethod,
    totalCollected,
    stillOpenTabsTotal,
    openTabsCount: openTabs.length,
  };
}
