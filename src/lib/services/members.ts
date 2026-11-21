import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolve, EntitlementResult } from "@/lib/services/entitlement";

type PaymentMethod = "CASH" | "CARD" | "UPI" | "ONLINE";

export interface MemberListItem {
  id: string;
  name: string;
  email: string;
  membershipNo: string;
  qrToken: string;
  planName: string;
  status: EntitlementResult["status"];
  courtDiscountPct: number;
  shopDiscountPct: number;
  barDiscountPct: number;
  endsAt: Date | null;
  banned?: boolean;
}

import { withDbRetry } from "@/lib/prisma";

export interface PaginatedMembers {
  members: MemberListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function searchMembers(
  query?: string,
  page = 1,
  pageSize = 20,
  statusFilter?: string
): Promise<PaginatedMembers> {
  const q = query?.trim();

  return withDbRetry(async () => {
    const conditions: any[] = [];

    if (q) {
      conditions.push({
        OR: [
          { membershipNo: { contains: q, mode: "insensitive" as const } },
          { qrToken: { contains: q, mode: "insensitive" as const } },
          { user: { name: { contains: q, mode: "insensitive" as const } } },
          { user: { email: { contains: q, mode: "insensitive" as const } } },
        ],
      });
    }

    if (statusFilter === "banned") {
      conditions.push({
        user: { bannedAt: { not: null } },
      });
    } else if (statusFilter === "junior_pending") {
      conditions.push({
        user: { bannedAt: null },
        ageVerifiedAt: null,
        memberships: {
          some: {
            replacedAt: null,
            endsAt: { gte: new Date() },
            plan: { name: { contains: "JUNIOR", mode: "insensitive" } },
          },
        },
      });
    } else if (statusFilter === "expiring") {
      // Exclude banned members from expiring soon
      conditions.push({
        user: { bannedAt: null },
      });
    }

    const whereClause = conditions.length > 0 ? { AND: conditions } : undefined;

    const [total, members] = await Promise.all([
      prisma.member.count({ where: whereClause }),
      prisma.member.findMany({
        where: whereClause,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: true,
          memberships: {
            include: { plan: true },
            orderBy: { endsAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const now = new Date();
    const results: MemberListItem[] = members.map((m) => {
      const isBanned = Boolean(m.user?.bannedAt);
      const latestMembership = m.memberships?.[0];
      let status: EntitlementResult["status"] = "WALK_IN";
      let planName = "WALK-IN";
      let courtDiscountPct = 0;
      let shopDiscountPct = 0;
      let barDiscountPct = 0;
      let endsAt: Date | null = null;

      if (latestMembership) {
        endsAt = new Date(latestMembership.endsAt);
        const graceEndsAt = new Date(endsAt.getTime() + 7 * 24 * 60 * 60 * 1000);

        if (now.getTime() > graceEndsAt.getTime()) {
          status = "EXPIRED";
        } else if (now.getTime() > endsAt.getTime()) {
          status = "GRACE";
        } else {
          status = "ACTIVE";
        }

        const isEligible = (status === "ACTIVE" || status === "GRACE") && !isBanned;
        planName = latestMembership.plan?.name || "MEMBER";
        courtDiscountPct = isEligible && latestMembership.plan ? Number(latestMembership.plan.courtDiscountPct) : 0;
        shopDiscountPct = isEligible && latestMembership.plan ? Number(latestMembership.plan.shopDiscountPct) : 0;
        barDiscountPct = isEligible && latestMembership.plan ? Number(latestMembership.plan.barDiscountPct) : 0;
      }

      return {
        id: m.id,
        name: m.user?.name || `Member ${m.membershipNo}`,
        email: m.user?.email || "No email",
        membershipNo: m.membershipNo,
        qrToken: m.qrToken,
        planName,
        status,
        courtDiscountPct,
        shopDiscountPct,
        barDiscountPct,
        endsAt,
        banned: isBanned,
      };
    });

    return {
      members: results,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  });
}

export async function getMemberDetail(idOrQr: string) {
  const member = await prisma.member.findFirst({
    where: {
      OR: [{ id: idOrQr }, { qrToken: idOrQr }, { membershipNo: idOrQr }],
    },
    include: {
      user: true,
      memberships: {
        include: { plan: true },
        orderBy: { endsAt: "desc" },
      },
      bookings: {
        include: { court: true },
        orderBy: { startsAt: "desc" },
        take: 10,
      },
      shopOrders: {
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      tabs: {
        include: { orders: { include: { items: { include: { barItem: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!member) return null;

  let bannedByName: string | null = null;
  if (member.user?.bannedById) {
    const staffUser = await prisma.user.findUnique({
      where: { id: member.user.bannedById },
      select: { name: true },
    });
    bannedByName = staffUser?.name || "Staff";
  }

  let ageVerifiedByName: string | null = null;
  if (member.ageVerifiedById) {
    const staffUser = await prisma.user.findUnique({
      where: { id: member.ageVerifiedById },
      select: { name: true },
    });
    ageVerifiedByName = staffUser?.name || "Staff";
  }

  const entitlement = await resolve(member.id);

  return {
    member,
    entitlement,
    bannedByName,
    ageVerifiedByName,
  };
}

export async function getPlans() {
  return await prisma.plan.findMany({
    orderBy: { price: "desc" },
  });
}

export async function createMemberService(data: {
  name: string;
  email: string;
  planId: string;
  paymentMethod: PaymentMethod;
}) {
  const plan = await prisma.plan.findUniqueOrThrow({
    where: { id: data.planId },
  });

  // Check if user exists or create
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const defaultPassword = process.env.SEED_MEMBER_PASSWORD || "Member123!";
    const res = await auth.api.signUpEmail({
      body: {
        name: data.name,
        email: data.email,
        password: defaultPassword,
      },
    });
    await prisma.user.update({
      where: { id: res.user.id },
      data: { role: "MEMBER" },
    });
    userId = res.user.id;
  }

  const memberCount = await prisma.member.count();
  const membershipNo = `CC-2026-${String(memberCount + 1).padStart(3, "0")}`;
  const qrToken = `QR-CC-${String(memberCount + 1).padStart(3, "0")}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const member = await prisma.member.create({
    data: {
      userId,
      membershipNo,
      qrToken,
      memberships: {
        create: {
          planId: plan.id,
          startsAt,
          endsAt,
          pricePaid: plan.price,
        },
      },
    },
    include: {
      memberships: true,
    },
  });

  const membership = member.memberships[0];

  await prisma.ledgerEntry.create({
    data: {
      source: "MEMBERSHIP",
      amount: plan.price,
      method: data.paymentMethod,
      kind: "COLLECTED",
      refType: "MEMBERSHIP",
      refId: membership.id,
      createdAt: startsAt,
    },
  });

  return member;
}

export async function renewMemberService(data: {
  memberId: string;
  planId: string;
  paymentMethod: PaymentMethod;
}) {
  const plan = await prisma.plan.findUniqueOrThrow({
    where: { id: data.planId },
  });

  const member = await prisma.member.findUniqueOrThrow({
    where: { id: data.memberId },
    include: {
      memberships: {
        orderBy: { endsAt: "desc" },
        take: 1,
      },
    },
  });

  const now = new Date();
  let startsAt = now;

  // If previous membership is still active, extend seamlessly from its endsAt
  if (member.memberships.length > 0 && new Date(member.memberships[0].endsAt) > now) {
    startsAt = new Date(member.memberships[0].endsAt);
  }

  const endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const membership = await prisma.membership.create({
    data: {
      memberId: member.id,
      planId: plan.id,
      startsAt,
      endsAt,
      pricePaid: plan.price,
    },
  });

  await prisma.ledgerEntry.create({
    data: {
      source: "MEMBERSHIP",
      amount: plan.price,
      method: data.paymentMethod,
      kind: "COLLECTED",
      refType: "MEMBERSHIP",
      refId: membership.id,
      createdAt: now,
    },
  });

  return membership;
}
