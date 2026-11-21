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
}

export async function searchMembers(query?: string): Promise<MemberListItem[]> {
  const q = query?.trim();

  const members = await prisma.member.findMany({
    where: q
      ? {
          OR: [
            { membershipNo: { contains: q, mode: "insensitive" } },
            { qrToken: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: {
      user: true,
      memberships: {
        include: { plan: true },
        orderBy: { endsAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const results: MemberListItem[] = [];

  for (const m of members) {
    const ent = await resolve(m.id, now);
    results.push({
      id: m.id,
      name: m.user?.name || `Member ${m.membershipNo}`,
      email: m.user?.email || "No email",
      membershipNo: m.membershipNo,
      qrToken: m.qrToken,
      planName: ent.plan?.name || "NONE",
      status: ent.status,
      courtDiscountPct: ent.courtDiscountPct,
      shopDiscountPct: ent.shopDiscountPct,
      barDiscountPct: ent.barDiscountPct,
      endsAt: ent.endsAt,
    });
  }

  return results;
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

  const entitlement = await resolve(member.id);

  return {
    member,
    entitlement,
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
