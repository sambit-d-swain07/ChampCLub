import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { Trophy, Sparkles, CheckCircle2, ArrowRight, Calendar, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MemberPlanPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

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
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display uppercase tracking-wider text-[#F4F1EA]">
            MEMBERSHIP <span className="font-serif italic lowercase text-[#C8F13A] font-normal">and</span> PRIVILEGES
          </h1>
          <p className="text-xs text-[#F4F1EA]/70 mt-1">
            Review your current club standing, tier benefits, and renewal schedule.
          </p>
        </div>

        <Link
          href="/member/choose-plan"
          className="inline-flex items-center justify-center gap-2 px-6 h-11 rounded-full font-bold text-xs tracking-wider uppercase bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all shadow-md self-start sm:self-auto"
        >
          <span>Change or Renew Plan</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Current Standing Card */}
      <div className="rounded-3xl p-8 bg-[#0E4433] border border-white/10 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-[#F4F1EA]">
              <Trophy className="h-3.5 w-3.5 text-[#C8F13A]" />
              {entitlement.plan?.name || "WALK-IN"} MEMBER
            </div>

            <div>
              <h2 className="text-3xl font-extrabold text-[#F4F1EA]">{user.name}</h2>
              <p className="text-xs font-mono text-[#F4F1EA]/60 mt-1">Member ID: {member.membershipNo}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-xs text-[#F4F1EA]/80">
              <div>
                <span className="text-[10px] uppercase text-[#F4F1EA]/50 block">Status</span>
                <span className="font-bold text-[#C8F13A]">{entitlement.status}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#F4F1EA]/50 block">Court Discount</span>
                <span className="font-bold text-[#F4F1EA]">{entitlement.courtDiscountPct}% OFF</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#F4F1EA]/50 block">Pro Shop</span>
                <span className="font-bold text-[#F4F1EA]">{entitlement.shopDiscountPct}% OFF</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#F4F1EA]/50 block">Champions Bar</span>
                <span className="font-bold text-[#F4F1EA]">{entitlement.barDiscountPct}% OFF</span>
              </div>
            </div>
          </div>

          <div className="text-right space-y-1">
            <span className="text-[10px] uppercase text-[#F4F1EA]/50 block">Expiry Date</span>
            <span className="text-lg font-bold font-mono text-[#F4F1EA]">
              {entitlement.endsAt ? new Date(entitlement.endsAt).toLocaleDateString("en-IN", { dateStyle: "long" }) : "No Active Term"}
            </span>
            {entitlement.status === "WALK_IN" && (
              <p className="text-[11px] text-[#C8F13A]">Standard rates apply to bookings and purchases.</p>
            )}
          </div>
        </div>
      </div>

      {/* Membership History */}
      <div className="rounded-3xl p-6 bg-[#07271D] border border-white/10 space-y-4">
        <h3 className="text-lg font-display uppercase tracking-wider text-[#F4F1EA]">
          MEMBERSHIP SUBSCRIPTION HISTORY
        </h3>
        {member.memberships.length > 0 ? (
          <div className="divide-y divide-white/10 text-xs">
            {member.memberships.map((m) => (
              <div key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-[#F4F1EA]">{m.plan.name} Membership</div>
                  <div className="text-[11px] text-[#F4F1EA]/50">
                    {new Date(m.startsAt).toLocaleDateString()} — {new Date(m.endsAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-[#C8F13A]">₹{Number(m.pricePaid).toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-[#F4F1EA]/50 uppercase">PAID ONLINE</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#F4F1EA]/50 py-4">No past membership records on file.</p>
        )}
      </div>
    </div>
  );
}
