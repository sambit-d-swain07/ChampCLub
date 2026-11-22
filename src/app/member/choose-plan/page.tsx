import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ChoosePlanView } from "@/components/member/choose-plan-view";

export const dynamic = "force-dynamic";

export default async function ChoosePlanPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const member = await prisma.member.findUnique({
    where: { userId: user.id },
    include: {
      memberships: {
        where: { replacedAt: null },
        include: { plan: true },
        orderBy: { startsAt: "desc" },
        take: 1,
      },
    },
  });

  if (!member) {
    redirect("/login");
  }

  const plans = await prisma.plan.findMany({
    orderBy: { price: "desc" },
  });

  const formattedPlans = plans.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    durationDays: p.durationDays,
    courtDiscountPct: Number(p.courtDiscountPct),
    shopDiscountPct: Number(p.shopDiscountPct),
    barDiscountPct: Number(p.barDiscountPct),
  }));

  const now = new Date();
  const activeMembership = member.memberships.find(
    (m) => !m.replacedAt && new Date(m.endsAt) >= now
  );

  const currentMembership = activeMembership
    ? {
        id: activeMembership.id,
        planId: activeMembership.planId,
        planName: activeMembership.plan.name,
        pricePaid: Number(activeMembership.pricePaid),
        endsAt: activeMembership.endsAt.toISOString(),
      }
    : null;

  const isCurrentJunior = Boolean(
    activeMembership && activeMembership.plan.name.toUpperCase().includes("JUNIOR")
  );
  const isAgeVerified = Boolean(member.ageVerifiedAt);
  const isJuniorUnverified = isCurrentJunior && !isAgeVerified;

  return (
    <div className="min-h-screen bg-[#F6F5E1] text-[#1B1B1B] py-12 px-6">
      <ChoosePlanView
        plans={formattedPlans}
        userName={user.name}
        currentMembership={currentMembership}
        memberDob={member.dateOfBirth ? member.dateOfBirth.toISOString() : null}
        isAgeVerified={isAgeVerified}
        isJuniorUnverified={isJuniorUnverified}
      />
    </div>
  );
}
