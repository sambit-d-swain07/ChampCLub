import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { Trophy, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MemberPlanPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Pure DB Query
  const member = await prisma.member.findUnique({
    where: { userId: user.id },
    include: {
      memberships: {
        include: { plan: true },
        orderBy: { endsAt: "desc" },
      },
    },
  });

  if (!member) {
    redirect("/login");
  }

  const entitlement = await resolve(member.id, new Date());
  const activeMembership = member.memberships[0];

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6 text-[#1B1B1B]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B1B1B]">
            Membership <span className="text-[#5F9E4A]">and</span> privileges
          </h1>
          <p className="text-xs text-[#1B1B1B]/70 mt-1">
            Review your current club standing, tier benefits, and renewal schedule.
          </p>
        </div>

        <Link
          href="/member/choose-plan"
          className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-full font-bold text-xs tracking-wider uppercase bg-[#1B1B1B] text-[#F6F5E1] hover:bg-black transition-all shadow-sm self-start sm:self-auto"
        >
          <span>Change or Renew Plan</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Current Standing Card */}
      <div className="rounded-[28px] p-8 bg-white border border-[#1B1B1B]/15 shadow-sm relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F6F5E1] border border-[#1B1B1B]/15 text-xs font-semibold text-[#1B1B1B]">
              <Trophy className="h-3.5 w-3.5 text-[#5F9E4A]" />
              <span>ACTIVE STANDING</span>
            </div>

            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#1B1B1B]">
                {entitlement.plan?.name || "WALK-IN"} MEMBER
              </h2>
              <p className="text-xs font-mono text-gray-500 mt-0.5">
                Status: {entitlement.status} • Digital Pass: {member.membershipNo}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs uppercase text-gray-400 block">Validity</span>
            <span className="text-lg font-bold text-[#5F9E4A]">
              {activeMembership
                ? `Expires ${new Date(activeMembership.endsAt).toLocaleDateString()}`
                : "Continuous Pay-As-You-Play"}
            </span>
          </div>
        </div>

        {/* Benefits breakdown */}
        <div className="pt-6 border-t border-[#1B1B1B]/10 grid sm:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-[#F6F5E1] border border-[#1B1B1B]/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Court Reservations
            </span>
            <div className="text-2xl font-extrabold text-[#5F9E4A] mt-1">
              {entitlement.courtDiscountPct}% OFF
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Applied automatically across all 6 courts.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F6F5E1] border border-[#1B1B1B]/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Pro Shop Merchandise
            </span>
            <div className="text-2xl font-extrabold text-[#5F9E4A] mt-1">
              {entitlement.shopDiscountPct}% OFF
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Rackets, balls, grips, and technical gear.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F6F5E1] border border-[#1B1B1B]/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Champions Cafe
            </span>
            <div className="text-2xl font-extrabold text-[#5F9E4A] mt-1">
              {entitlement.barDiscountPct}% OFF
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Artisanal cafeteria and post-match recovery tabs.
            </p>
          </div>
        </div>
      </div>

      {/* Plan History from Database */}
      <div className="rounded-[28px] p-6 bg-white border border-[#1B1B1B]/15 shadow-sm space-y-4">
        <h3 className="text-base font-bold tracking-tight text-[#1B1B1B]">
          MEMBERSHIP SUBSCRIPTION HISTORY
        </h3>

        {member.memberships.length === 0 ? (
          <p className="text-xs text-gray-500 py-4">
            No previous paid subscriptions. You are currently on the walk-in tier.
          </p>
        ) : (
          <div className="divide-y divide-[#1B1B1B]/10 text-xs">
            {member.memberships.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#1B1B1B]">{m.plan.name} TIER</div>
                  <div className="text-[11px] text-gray-400">
                    {new Date(m.startsAt).toLocaleDateString()} – {new Date(m.endsAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#1B1B1B]">
                    ₹{Number(m.pricePaid).toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-[#5F9E4A] font-semibold">PAID ONLINE</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
