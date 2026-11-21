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

  return (
    <div className="min-h-screen bg-[#F6F5E1] text-[#1B1B1B] py-12 px-6">
      <ChoosePlanView plans={formattedPlans} userName={user.name} />
    </div>
  );
}
