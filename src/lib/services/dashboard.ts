import { prisma } from "@/lib/prisma";

export async function getDashboardMetrics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Run in parallel for high performance
  const [
    memberCount,
    activeBookingsCount,
    recentBookings,
    ledgerTotals,
    recentLedger,
    expiringMemberships,
    lowStockProducts,
    lowStockBarItems,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.booking.count({
      where: {
        startsAt: { gte: thirtyDaysAgo },
        status: { in: ["CONFIRMED", "HELD"] },
      },
    }),
    prisma.booking.findMany({
      take: 6,
      orderBy: { startsAt: "desc" },
      include: {
        court: true,
        member: {
          include: {
            user: true,
          },
        },
      },
    }),
    prisma.ledgerEntry.groupBy({
      by: ["source"],
      _sum: {
        amount: true,
      },
      where: {
        kind: "COLLECTED",
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.ledgerEntry.findMany({
      take: 7,
      orderBy: { createdAt: "desc" },
    }),
    prisma.membership.findMany({
      where: {
        endsAt: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        member: {
          include: {
            user: true,
          },
        },
        plan: true,
      },
      take: 5,
      orderBy: { endsAt: "asc" },
    }),
    prisma.product.findMany({
      where: {
        stockQty: { lte: 10 },
      },
      take: 5,
    }),
    prisma.barItem.findMany({
      where: {
        stockQty: { lte: 25 },
      },
      take: 5,
    }),
  ]);

  // Aggregate total revenue and sources
  let totalRevenue = 0;
  const revenueBySource: Record<string, number> = {
    COURT: 0,
    SHOP: 0,
    BAR: 0,
    MEMBERSHIP: 0,
  };

  for (const group of ledgerTotals) {
    const amt = Number(group._sum.amount || 0);
    revenueBySource[group.source] = amt;
    totalRevenue += amt;
  }

  const revenueChartData = [
    { name: "Courts", value: revenueBySource.COURT, fill: "#2563eb" },
    { name: "Pro Shop", value: revenueBySource.SHOP, fill: "#16a34a" },
    { name: "Bar & F&B", value: revenueBySource.BAR, fill: "#f59e0b" },
    { name: "Memberships", value: revenueBySource.MEMBERSHIP, fill: "#8b5cf6" },
  ];

  return {
    memberCount,
    activeBookingsCount,
    totalRevenue,
    revenueBySource,
    revenueChartData,
    recentBookings,
    recentLedger,
    expiringMemberships,
    lowStockAlerts: [
      ...lowStockProducts.map((p) => ({ id: p.id, name: p.name, type: "Shop", stockQty: p.stockQty, reorderLevel: p.reorderLevel })),
      ...lowStockBarItems.map((b) => ({ id: b.id, name: b.name, type: "Bar", stockQty: b.stockQty, reorderLevel: b.reorderLevel })),
    ],
  };
}
