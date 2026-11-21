import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { cancelPlanChangeAction } from "@/app/actions/members";
import { Trophy, ArrowRight, ShieldCheck, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string) {
  return format(new Date(d), "dd MMM yyyy");
}

function fmtRs(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

export default async function MemberPlanPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const member = await prisma.member.findUnique({
    where: { userId: user.id },
    include: {
      memberships: {
        include: { plan: true, nextPlan: true },
        orderBy: { startsAt: "desc" },
      },
    },
  });

  if (!member) {
    redirect("/login");
  }

  const entitlement = await resolve(member.id, new Date());
  const now = new Date();

  // The single active membership (not replaced, not expired)
  const activeMembership = member.memberships.find(
    (m) => !m.replacedAt && new Date(m.endsAt) >= now
  );

  const scheduledChange = activeMembership?.nextPlan ?? null;

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
          prefetch={false}
          href="/member/choose-plan"
          className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-full font-bold text-xs tracking-wider uppercase bg-[#1B1B1B] text-[#F6F5E1] hover:bg-black transition-all shadow-sm self-start sm:self-auto"
        >
          <span>Change or Renew Plan</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Scheduled change banner */}
      {scheduledChange && activeMembership && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                Switching to {scheduledChange.name} on {fmtDate(activeMembership.endsAt)}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Nothing to pay now. Your current plan benefits continue until expiry.
              </p>
            </div>
          </div>
          <form action={async () => { "use server"; await cancelPlanChangeAction(); }}>
            <button
              type="submit"
              className="text-xs font-bold px-4 py-2 rounded-full border border-amber-400 text-amber-800 hover:bg-amber-100 cursor-pointer"
            >
              Cancel change
            </button>
          </form>
        </div>
      )}

      {/* Current Standing Card */}
      <div className="rounded-[28px] p-8 bg-white border border-[#1B1B1B]/15 shadow-sm relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F6F5E1] border border-[#1B1B1B]/15 text-xs font-semibold text-[#1B1B1B]">
              <Trophy className="h-3.5 w-3.5 text-[#5F9E4A]" />
              <span>
                {entitlement.status === "ACTIVE"
                  ? "ACTIVE STANDING"
                  : entitlement.status === "GRACE"
                  ? "GRACE PERIOD"
                  : "WALK-IN"}
              </span>
            </div>

            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#1B1B1B]">
                {entitlement.plan?.name || "WALK-IN"} MEMBER
              </h2>
              <p className="text-xs font-mono text-gray-500 mt-0.5">
                Status: {entitlement.status} · Digital Pass: {member.membershipNo}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs uppercase text-gray-400 block">Validity</span>
            <span className="text-lg font-bold text-[#5F9E4A]">
              {activeMembership
                ? `Expires ${fmtDate(activeMembership.endsAt)}`
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

      {/* Plan History */}
      <div className="rounded-[28px] p-6 bg-white border border-[#1B1B1B]/15 shadow-sm space-y-4">
        <h3 className="text-base font-bold tracking-tight text-[#1B1B1B]">
          MEMBERSHIP HISTORY
        </h3>

        {member.memberships.length === 0 ? (
          <p className="text-xs text-gray-500 py-4">
            No previous paid subscriptions. You are currently on the walk-in tier.
          </p>
        ) : (
          <div className="divide-y divide-[#1B1B1B]/10 text-xs">
            {member.memberships.map((m) => {
              const isActive = !m.replacedAt && new Date(m.endsAt) >= now;
              const isReplaced = !!m.replacedAt;
              const isExpired = !m.replacedAt && new Date(m.endsAt) < now;

              return (
                <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-[#1B1B1B]">{m.plan.name} TIER</div>
                    <div className="text-[11px] text-gray-400">
                      {fmtDate(m.startsAt)} – {fmtDate(m.endsAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#1B1B1B]">
                      {fmtRs(Number(m.pricePaid))}
                    </div>
                    {isActive ? (
                      <span className="text-[10px] text-[#5F9E4A] font-semibold">CURRENT</span>
                    ) : isReplaced ? (
                      <span className="text-[10px] text-gray-400 font-semibold">
                        Replaced on {fmtDate(m.replacedAt!)}
                      </span>
                    ) : isExpired ? (
                      <span className="text-[10px] text-gray-400 font-semibold">EXPIRED</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
