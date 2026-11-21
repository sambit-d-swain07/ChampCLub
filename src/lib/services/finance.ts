import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";

export interface DateRangeFilter {
  start: Date;
  end: Date;
  label: string;
  rangeType: "today" | "week" | "month" | "custom";
}

/**
 * Resolves date range in Asia/Kolkata timezone.
 */
export function resolveFinanceRange(range?: string, from?: string, to?: string): DateRangeFilter {
  const now = new Date();
  const kolkataStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  if (range === "today") {
    const start = new Date(`${kolkataStr}T00:00:00+05:30`);
    const end = new Date(`${kolkataStr}T23:59:59.999+05:30`);
    return { start, end, label: "Today", rangeType: "today" };
  }

  if (range === "week") {
    const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    const startStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(sevenDaysAgo);
    const start = new Date(`${startStr}T00:00:00+05:30`);
    const end = new Date(`${kolkataStr}T23:59:59.999+05:30`);
    return { start, end, label: "This Week", rangeType: "week" };
  }

  if (range === "custom" && from && to) {
    const start = new Date(`${from}T00:00:00+05:30`);
    const end = new Date(`${to}T23:59:59.999+05:30`);
    return { start, end, label: `${from} to ${to}`, rangeType: "custom" };
  }

  // Default to "month": 1st of current month to end of today
  const [yearStr, monthStr] = kolkataStr.split("-");
  const start = new Date(`${yearStr}-${monthStr}-01T00:00:00+05:30`);
  const end = new Date(`${kolkataStr}T23:59:59.999+05:30`);
  return { start, end, label: "This Month", rangeType: "month" };
}

export async function getOwnerFinancials(filter: DateRangeFilter) {
  const { start, end } = filter;
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Parallel database fetch
  const [
    earnedGroup,
    collectedGroup,
    refundedGroup,
    expensesList,
    ledgerTimeline,
    paymentMethodsGroup,
    courts,
    courtBookings,
    openTabs,
    lowStockProducts,
    lowStockBar,
    expiringMemberships,
    overdueLeads,
    topShopItems,
    topBarItems,
  ] = await Promise.all([
    // 1. Earned sum in range
    prisma.ledgerEntry.aggregate({
      where: { kind: "EARNED", createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    // 2. Collected sum in range
    prisma.ledgerEntry.aggregate({
      where: { kind: "COLLECTED", createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    // 3. Refunded sum in range
    prisma.ledgerEntry.aggregate({
      where: { kind: "REFUNDED", createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    // 4. Expenses in range
    prisma.expense.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: "desc" },
    }),
    // 5. Entries for timeline chart in range
    prisma.ledgerEntry.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { createdAt: true, source: true, kind: true, amount: true },
      orderBy: { createdAt: "asc" },
    }),
    // 6. Collected by payment method
    prisma.ledgerEntry.groupBy({
      by: ["method"],
      where: { kind: "COLLECTED", createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    // 7. Courts
    prisma.court.findMany({ select: { id: true, name: true, sport: true } }),
    // 8. Bookings in range for utilisation
    prisma.booking.findMany({
      where: {
        startsAt: { gte: start, lte: end },
        status: { in: ["CONFIRMED", "HELD"] },
      },
      select: { courtId: true },
    }),
    // 9. Open tabs
    prisma.tab.findMany({
      where: { status: "OPEN" },
      include: {
        table: true,
        member: { include: { user: true } },
      },
      orderBy: { openedAt: "desc" },
    }),
    // 10. Low stock products
    prisma.product.findMany({
      where: { stockQty: { lte: 10 } },
      select: { id: true, name: true, stockQty: true, reorderLevel: true, price: true },
      take: 8,
    }),
    // 11. Low stock bar items
    prisma.barItem.findMany({
      where: { stockQty: { lte: 25 } },
      select: { id: true, name: true, stockQty: true, reorderLevel: true, price: true },
      take: 8,
    }),
    // 12. Expiring memberships
    prisma.membership.findMany({
      where: { endsAt: { gte: now, lte: sevenDaysFromNow } },
      include: { member: { include: { user: true } }, plan: true },
      take: 8,
      orderBy: { endsAt: "asc" },
    }),
    // 13. Overdue leads (NEW > 2 hours)
    prisma.lead.findMany({
      where: { status: "NEW", createdAt: { lt: twoHoursAgo } },
      take: 8,
      orderBy: { createdAt: "asc" },
    }),
    // 14. Top shop items
    prisma.shopOrderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, priceSnapshot: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    // 15. Top bar items
    prisma.barOrderItem.groupBy({
      by: ["barItemId"],
      _sum: { quantity: true, priceSnapshot: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  // Aggregate Top Products metadata
  const shopProductIds = topShopItems.map((item) => item.productId);
  const barItemIds = topBarItems.map((item) => item.barItemId);

  const [shopProductsMap, barItemsMap] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: shopProductIds } },
      select: { id: true, name: true },
    }),
    prisma.barItem.findMany({
      where: { id: { in: barItemIds } },
      select: { id: true, name: true },
    }),
  ]);

  const shopNameMap = new Map(shopProductsMap.map((p) => [p.id, p.name]));
  const barNameMap = new Map(barItemsMap.map((b) => [b.id, b.name]));

  const topProducts = [
    ...topShopItems.map((item) => ({
      name: shopNameMap.get(item.productId) || "Shop Item",
      quantity: item._sum.quantity || 0,
      category: "Pro Shop",
    })),
    ...topBarItems.map((item) => ({
      name: barNameMap.get(item.barItemId) || "Bar Item",
      quantity: item._sum.quantity || 0,
      category: "Bar & Cafe",
    })),
  ].sort((a, b) => b.quantity - a.quantity).slice(0, 6);

  // Cards Calculation
  const earned = Number(earnedGroup._sum.amount || 0);
  const collected = Number(collectedGroup._sum.amount || 0);
  const refunded = Number(refundedGroup._sum.amount || 0);
  
  let totalExpenses = 0;
  const parsedExpenses = expensesList.map((exp) => {
    let vendor = exp.title;
    let isPaid = true;
    let description = exp.notes || "";
    try {
      if (exp.notes) {
        const parsed = JSON.parse(exp.notes);
        if (parsed.vendor) vendor = parsed.vendor;
        if (typeof parsed.paid === "boolean") isPaid = parsed.paid;
        if (parsed.notes) description = parsed.notes;
      }
    } catch {
      if (exp.notes?.includes("[UNPAID]")) isPaid = false;
    }
    const amt = Number(exp.amount);
    totalExpenses += amt;
    return {
      ...exp,
      amountNum: amt,
      vendor,
      isPaid,
      description,
    };
  });

  const outstanding = Math.max(0, earned - collected);
  const net = collected - totalExpenses - refunded;

  // Revenue by source over time (grouped by day)
  const dayGroups: Record<string, { date: string; COURT: number; SHOP: number; BAR: number; MEMBERSHIP: number }> = {};
  for (const entry of ledgerTimeline) {
    if (entry.kind !== "EARNED" && entry.kind !== "COLLECTED") continue;
    const dayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "numeric",
    }).format(entry.createdAt);

    if (!dayGroups[dayKey]) {
      dayGroups[dayKey] = { date: dayKey, COURT: 0, SHOP: 0, BAR: 0, MEMBERSHIP: 0 };
    }
    if (entry.kind === "COLLECTED") {
      dayGroups[dayKey][entry.source] += Number(entry.amount);
    }
  }
  const revenueOverTime = Object.values(dayGroups);

  // Payment method breakdown
  const paymentMethodBreakdown = paymentMethodsGroup.map((item) => ({
    name: item.method,
    amount: Number(item._sum.amount || 0),
  }));

  // Court utilisation percentage
  // 16 available hours per day per court (06:00 to 22:00)
  const daysInRange = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const totalCapacityHours = daysInRange * 16;

  const bookingsByCourt: Record<string, number> = {};
  for (const b of courtBookings) {
    bookingsByCourt[b.courtId] = (bookingsByCourt[b.courtId] || 0) + 1; // 1 session = 1 hr
  }

  const courtUtilisation = courts.map((c) => {
    const booked = bookingsByCourt[c.id] || 0;
    const pct = Math.min(100, Math.round((booked / totalCapacityHours) * 100));
    return {
      id: c.id,
      name: c.name,
      sport: c.sport,
      bookedHours: booked,
      capacityHours: totalCapacityHours,
      percentage: pct,
    };
  });

  // Calculate unpaid balances for open tabs
  const openTabIds = openTabs.map((t) => t.id);
  const tabPayments = openTabIds.length > 0
    ? await prisma.ledgerEntry.findMany({
        where: { source: "BAR", kind: "COLLECTED", refType: "TAB", refId: { in: openTabIds } },
      })
    : [];
  const tabPaidMap = new Map<string, number>();
  for (const p of tabPayments) {
    tabPaidMap.set(p.refId, (tabPaidMap.get(p.refId) || 0) + Number(p.amount));
  }

  const detailedOpenTabs = openTabs.map((t) => {
    const totalLines = Number(t.totalAmount);
    const paid = tabPaidMap.get(t.id) || 0;
    const balance = Math.max(0, totalLines - paid);
    return {
      id: t.id,
      tableName: t.table?.name || "Open Table",
      memberName: t.member?.user?.name || null,
      openedAt: t.openedAt,
      totalAmount: totalLines,
      paid,
      balance,
    };
  });

  // Unpaid expenses (payable)
  const expensesPayable = parsedExpenses.filter((e) => !e.isPaid);

  return {
    filter,
    cards: {
      earned,
      collected,
      outstanding,
      refunded,
      expenses: totalExpenses,
      net,
    },
    charts: {
      revenueOverTime,
      paymentMethodBreakdown,
      topProducts,
      courtUtilisation,
    },
    lists: {
      openTabs: detailedOpenTabs,
      lowStock: [
        ...lowStockProducts.map((p) => ({ id: p.id, name: p.name, stockQty: p.stockQty, reorderLevel: p.reorderLevel, type: "Shop" })),
        ...lowStockBar.map((b) => ({ id: b.id, name: b.name, stockQty: b.stockQty, reorderLevel: b.reorderLevel, type: "Bar" })),
      ],
      expiringMemberships: expiringMemberships.map((m) => ({
        id: m.id,
        memberName: m.member.user?.name || `Member ${m.member.membershipNo}`,
        planName: m.plan.name,
        endsAt: m.endsAt,
      })),
      overdueLeads: overdueLeads.map((l) => ({
        id: l.id,
        name: l.name,
        source: l.source,
        createdAt: l.createdAt,
      })),
      expensesPayable,
    },
    rawExpenses: parsedExpenses,
  };
}

/**
 * Creates an HMAC signed share token for a given date range filter.
 */
export function generateShareToken(filter: { range: string; from?: string; to?: string }, expiresInHours = 24): string {
  const secret = process.env.BETTER_AUTH_SECRET || "chamclub-default-signing-secret-minimum32chars";
  const expiresAt = Date.now() + expiresInHours * 60 * 60 * 1000;
  const payload = JSON.stringify({
    range: filter.range,
    from: filter.from || null,
    to: filter.to || null,
    expiresAt,
  });

  const b64Payload = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", secret).update(b64Payload).digest("base64url");
  return `${b64Payload}.${signature}`;
}

/**
 * Verifies an HMAC signed share token.
 */
export function verifyShareToken(token: string): { range: string; from?: string; to?: string } | null {
  try {
    const secret = process.env.BETTER_AUTH_SECRET || "chamclub-default-signing-secret-minimum32chars";
    const [b64Payload, signature] = token.split(".");
    if (!b64Payload || !signature) return null;

    const expectedSig = createHmac("sha256", secret).update(b64Payload).digest("base64url");
    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(Buffer.from(b64Payload, "base64url").toString("utf-8"));
    if (typeof decoded.expiresAt !== "number" || Date.now() > decoded.expiresAt) {
      return null; // Expired
    }

    return {
      range: decoded.range,
      from: decoded.from,
      to: decoded.to,
    };
  } catch {
    return null;
  }
}
