import { prisma } from "@/lib/prisma";

export interface EntitlementResult {
  memberId: string | null;
  name: string;
  membershipNo: string | null;
  plan: {
    id: string;
    name: string;
  } | null;
  status: "ACTIVE" | "GRACE" | "EXPIRED" | "WALK_IN" | "PENDING_VERIFICATION";
  courtDiscountPct: number;
  shopDiscountPct: number;
  barDiscountPct: number;
  bookingsLeftToday: number;
  endsAt: Date | null;
  graceEndsAt: Date | null;
  ageVerified?: boolean;
  ageVerifiedAt?: Date | null;
  ageDocType?: string | null;
  juniorExpiredByAge?: boolean;
}

/**
 * Single source of truth for entitlements across all modules.
 * Expiry is COMPUTED from endsAt with a 7-day grace period, NEVER stored.
 * Null memberId represents a walk-in guest with zero discount.
 */
export async function resolve(
  memberId: string | null,
  at: Date = new Date(),
  preloadedMember?: any
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

  const member =
    preloadedMember !== undefined
      ? preloadedMember
      : await prisma.member.findUnique({
          where: { id: memberId },
          include: {
            user: true,
            memberships: {
              where: { replacedAt: null },
              include: { plan: true },
              orderBy: { startsAt: "desc" },
              take: 1,
            },
          },
        });

  if (!member) {
    return {
      memberId: null,
      name: "Unknown Member",
      membershipNo: null,
      plan: null,
      status: "EXPIRED",
      courtDiscountPct: 0,
      shopDiscountPct: 0,
      barDiscountPct: 0,
      bookingsLeftToday: 0,
      endsAt: null,
      graceEndsAt: null,
    };
  }

  // Banned members receive zero benefits, zero quota, and expired status
  if (member.user?.bannedAt) {
    return {
      memberId: member.id,
      name: member.user?.name || `Member ${member.membershipNo}`,
      membershipNo: member.membershipNo,
      plan: null,
      status: "EXPIRED",
      courtDiscountPct: 0,
      shopDiscountPct: 0,
      barDiscountPct: 0,
      bookingsLeftToday: 0,
      endsAt: null,
      graceEndsAt: null,
    };
  }

  if (member.memberships.length === 0) {
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
  const isJunior = plan.name.toUpperCase().includes("JUNIOR");

  // Junior plan age & verification calculations
  let effectiveEndsAt = new Date(latestMembership.endsAt);
  let juniorExpiredByAge = false;

  if (isJunior && member.dateOfBirth) {
    const dob = new Date(member.dateOfBirth);
    // 18th birthday is: dob year + 18
    const eighteenthBday = new Date(dob);
    eighteenthBday.setFullYear(eighteenthBday.getFullYear() + 18);

    if (eighteenthBday < effectiveEndsAt) {
      effectiveEndsAt = eighteenthBday;
    }

    if (at >= eighteenthBday) {
      juniorExpiredByAge = true;
    }
  }

  // 7-day auto-cancellation for unverified Junior membership
  const createdAtMs = new Date(latestMembership.createdAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const isUnverifiedJunior = isJunior && !member.ageVerifiedAt;

  if (isUnverifiedJunior && (at.getTime() - createdAtMs > sevenDaysMs) && !latestMembership.replacedAt) {
    // Cancel the membership and issue REFUNDED ledger entry
    try {
      await prisma.$transaction(async (tx) => {
        await tx.membership.update({
          where: { id: latestMembership.id },
          data: { replacedAt: at },
        });
        const refundAmt = Number(latestMembership.pricePaid);
        if (refundAmt > 0) {
          await tx.ledgerEntry.create({
            data: {
              source: "MEMBERSHIP",
              amount: refundAmt,
              method: "ONLINE",
              kind: "REFUNDED",
              refType: "MEMBERSHIP",
              refId: latestMembership.id,
              createdAt: at,
            },
          });
        }
      });
    } catch (e) {
      console.error("[Entitlement] Auto-cancel unverified junior error:", e);
    }

    return {
      memberId: member.id,
      name: member.user?.name || `Member ${member.membershipNo}`,
      membershipNo: member.membershipNo,
      plan: null,
      status: "EXPIRED",
      courtDiscountPct: 0,
      shopDiscountPct: 0,
      barDiscountPct: 0,
      bookingsLeftToday: 0,
      endsAt: null,
      graceEndsAt: null,
      ageVerified: false,
      juniorExpiredByAge: false,
    };
  }

  const endsAt = effectiveEndsAt;
  const graceEndsAt = new Date(endsAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  let status: "ACTIVE" | "GRACE" | "EXPIRED" | "PENDING_VERIFICATION" = "ACTIVE";

  if (juniorExpiredByAge || at.getTime() > graceEndsAt.getTime()) {
    status = "EXPIRED";
  } else if (isUnverifiedJunior) {
    status = "PENDING_VERIFICATION";
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

  // Daily quota: GOLD = 4, others = 2, EXPIRED = 0, PENDING_VERIFICATION = 2 but 0 discounts
  const dailyQuota = status === "EXPIRED" ? 0 : plan.name === "GOLD" ? 4 : 2;
  const bookingsLeftToday = Math.max(0, dailyQuota - bookingsToday);

  // For Junior: discounts apply only when verified AND age < 18
  const isEligible =
    (status === "ACTIVE" || status === "GRACE") &&
    (!isJunior || (Boolean(member.ageVerifiedAt) && !juniorExpiredByAge));

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
    ageVerified: Boolean(member.ageVerifiedAt),
    ageVerifiedAt: member.ageVerifiedAt,
    ageDocType: member.ageDocType,
    juniorExpiredByAge,
  };
}
