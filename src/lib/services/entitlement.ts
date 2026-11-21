import { prisma } from "@/lib/prisma";

export interface EntitlementResult {
  memberId: string | null;
  name: string;
  membershipNo: string | null;
  plan: {
    id: string;
    name: string;
  } | null;
  status: "ACTIVE" | "GRACE" | "EXPIRED" | "WALK_IN";
  courtDiscountPct: number;
  shopDiscountPct: number;
  barDiscountPct: number;
  bookingsLeftToday: number;
  endsAt: Date | null;
  graceEndsAt: Date | null;
}

/**
 * Single source of truth for entitlements across all modules.
 * Expiry is COMPUTED from endsAt with a 7-day grace period, NEVER stored.
 * Null memberId represents a walk-in guest with zero discount.
 */
export async function resolve(
  memberId: string | null,
  at: Date = new Date()
): Promise<EntitlementResult> {
  if (!memberId) {
    return {
      memberId: null,
      name: "Walk-in Guest",
      membershipNo: null,
      plan: null,
      status: "WALK_IN",
      courtDiscountPct: 0,
      shopDiscountPct: 0,
      barDiscountPct: 0,
      bookingsLeftToday: 0,
      endsAt: null,
      graceEndsAt: null,
    };
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      user: true,
      memberships: {
        include: { plan: true },
        orderBy: { endsAt: "desc" },
        take: 1,
      },
    },
  });

  if (!member || member.memberships.length === 0) {
    let bookingsToday = 0;
    if (member?.id) {
      const startOfDay = new Date(at);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(at);
      endOfDay.setHours(23, 59, 59, 999);
      bookingsToday = await prisma.booking.count({
        where: {
          memberId: member.id,
          startsAt: { gte: startOfDay, lte: endOfDay },
          status: { in: ["HELD", "CONFIRMED"] },
        },
      });
    }

    return {
      memberId,
      name: member?.user?.name || (member ? `Member ${member.membershipNo}` : "Unknown Member"),
      membershipNo: member?.membershipNo || null,
      plan: null,
      status: member ? "WALK_IN" : "EXPIRED",
      courtDiscountPct: 0,
      shopDiscountPct: 0,
      barDiscountPct: 0,
      bookingsLeftToday: member ? Math.max(0, 2 - bookingsToday) : 0,
      endsAt: null,
      graceEndsAt: null,
    };
  }

  const latestMembership = member.memberships[0];
  const plan = latestMembership.plan;
  const endsAt = new Date(latestMembership.endsAt);
  // 7-day grace period computed on-the-fly
  const graceEndsAt = new Date(endsAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  let status: "ACTIVE" | "GRACE" | "EXPIRED" = "ACTIVE";
  if (at.getTime() > graceEndsAt.getTime()) {
    status = "EXPIRED";
  } else if (at.getTime() > endsAt.getTime()) {
    status = "GRACE";
  } else {
    status = "ACTIVE";
  }

  // Count bookings made today
  const startOfDay = new Date(at);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(at);
  endOfDay.setHours(23, 59, 59, 999);

  const bookingsToday = await prisma.booking.count({
    where: {
      memberId,
      startsAt: { gte: startOfDay, lte: endOfDay },
      status: { in: ["HELD", "CONFIRMED"] },
    },
  });

  // Daily quota: GOLD = 4, others = 2
  const dailyQuota = status === "EXPIRED" ? 0 : plan.name === "GOLD" ? 4 : 2;
  const bookingsLeftToday = Math.max(0, dailyQuota - bookingsToday);

  const isEligible = status === "ACTIVE" || status === "GRACE";

  return {
    memberId: member.id,
    name: member.user?.name || `Member ${member.membershipNo}`,
    membershipNo: member.membershipNo,
    plan: {
      id: plan.id,
      name: plan.name,
    },
    status,
    courtDiscountPct: isEligible ? Number(plan.courtDiscountPct) : 0,
    shopDiscountPct: isEligible ? Number(plan.shopDiscountPct) : 0,
    barDiscountPct: isEligible ? Number(plan.barDiscountPct) : 0,
    bookingsLeftToday,
    endsAt,
    graceEndsAt,
  };
}
