"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { choosePlanAction } from "@/app/actions/members";
import { Check, ArrowRight, Loader2, Sparkles, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";

interface PlanItem {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  courtDiscountPct: number;
  shopDiscountPct: number;
  barDiscountPct: number;
}

interface CurrentMembership {
  id: string;
  planId: string;
  planName: string;
  pricePaid: number;
  endsAt: string;
}

interface Props {
  plans: PlanItem[];
  userName: string;
  currentMembership?: CurrentMembership | null;
  memberDob?: string | null; // ISO string or null
}

function fmtRs(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

function fmtDate(d: string | Date) {
  return format(new Date(d), "dd MMM yyyy");
}

function calcAge(dobStr: string): number | null {
  if (!dobStr) return null;
  const birth = new Date(dobStr);
  if (isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

export function ChoosePlanView({ plans, userName, currentMembership, memberDob }: Props) {
  const router = useRouter();
  const [dob, setDob] = useState<string>(memberDob ? new Date(memberDob).toISOString().split("T")[0] : "");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ scheduled?: boolean; startsOn?: string; planName?: string; upgraded?: boolean; amountDue?: number; credit?: number } | null>(null);

  const currentAge = dob ? calcAge(dob) : memberDob ? calcAge(memberDob) : null;
  const isJuniorEligible = currentAge !== null && currentAge < 18;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const currentPlan = currentMembership ? plans.find((p) => p.id === currentMembership.planId) : null;

  function getPlanState(plan: PlanItem): "current" | "upgrade" | "downgrade" | "unavailable" {
    const isJunior = plan.name.toUpperCase().includes("JUNIOR");
    if (isJunior && currentAge !== null && currentAge >= 18) return "unavailable";
    if (!currentMembership) return "upgrade"; // fresh activation
    if (currentMembership.planId === plan.id) return "current";
    if (plan.price > (currentPlan?.price ?? 0)) return "upgrade";
    return "downgrade";
  }

  function getUpgradeDetails(plan: PlanItem) {
    if (!currentMembership) return { credit: 0, amountDue: plan.price };
    const credit = Number(currentMembership.pricePaid);
    const amountDue = Math.max(0, plan.price - credit);
    return { credit, amountDue };
  }

  function handleSelectPlan(planId: string) {
    const st = getPlanState(plans.find((p) => p.id === planId)!);
    if (st === "current" || st === "unavailable") return;
    setSelectedPlanId(planId);
    setShowConfirm(true);
    setError(null);
  }

  function handleConfirm() {
    if (!selectedPlanId) return;
    setError(null);

    startTransition(async () => {
      const payload = new FormData();
      payload.set("planId", selectedPlanId);
      if (dob) payload.set("dob", dob);

      const res = await choosePlanAction(payload);
      if (!res.success) {
        setError(res.error || "Failed to process membership selection.");
        setShowConfirm(false);
        return;
      }

      setShowConfirm(false);
      if (res.scheduled) {
        setResult({ scheduled: true, startsOn: res.startsOn, planName: res.planName });
      } else if (res.upgraded) {
        setResult({ upgraded: true, amountDue: res.amountDue, credit: res.credit });
      } else {
        router.push("/member/plan");
        router.refresh();
      }
    });
  }

  if (result?.scheduled) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-16">
        <div className="text-5xl">📅</div>
        <h2 className="text-2xl font-extrabold text-[#1B1B1B]">Plan change scheduled</h2>
        <p className="text-sm text-[#1B1B1B]/70">
          Your current plan continues until it expires. You will switch to <strong>{result.planName}</strong> on{" "}
          <strong>{result.startsOn ? fmtDate(result.startsOn) : "expiry"}</strong>. No payment now.
        </p>
        <Link prefetch={false} href="/member/plan" className="inline-block px-6 py-3 rounded-full bg-[#1B1B1B] text-[#F6F5E1] font-bold text-sm">
          View my plan →
        </Link>
      </div>
    );
  }

  if (result?.upgraded) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-16">
        <h2 className="text-2xl font-extrabold text-[#1B1B1B]">Plan upgraded</h2>
        <p className="text-sm text-[#1B1B1B]/70">
          {result.amountDue === 0
            ? `Upgraded for free — your credit (${fmtRs(result.credit ?? 0)}) covered the full amount.`
            : `You paid ${fmtRs(result.amountDue ?? 0)} (after ${fmtRs(result.credit ?? 0)} credit). Your new plan is active immediately.`}
        </p>
        <Link prefetch={false} href="/member/plan" className="inline-block px-6 py-3 rounded-full bg-[#5F9E4A] text-white font-bold text-sm">
          View my plan →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-[#1B1B1B]">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#1B1B1B]/15 text-xs font-semibold text-[#5F9E4A] shadow-2xs">
          <Sparkles className="h-3.5 w-3.5" /> WELCOME TO THE CHAMPIONS CLUB
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1B1B1B]">
          {currentMembership ? "Change your plan," : "Select your membership tier,"} {userName}
        </h1>
        <p className="text-xs sm:text-sm text-[#1B1B1B]/70 max-w-xl mx-auto">
          {currentMembership
            ? "Upgrade now or schedule a downgrade for when your current plan expires."
            : "Choose a privilege tier below for automated discounts across courts, Pro Shop, and cafe."}
        </p>
      </div>

      {/* DOB strip (for Junior eligibility) */}
      <div className="max-w-md mx-auto bg-white border border-[#1B1B1B]/15 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="dob" className="text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/80">
            Date of Birth (required for Junior plan)
          </label>
          {currentAge !== null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isJuniorEligible ? "bg-[#E8883A] text-[#1B1B1B]" : "bg-[#EDECCF] text-[#1B1B1B]"}`}>
              Age: {currentAge} yrs {isJuniorEligible ? "· Junior Eligible" : "· Adult"}
            </span>
          )}
        </div>
        <input
          id="dob"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="w-full h-11 px-4 rounded-xl bg-[#F6F5E1] border border-[#1B1B1B]/20 text-[#1B1B1B] text-sm focus:border-[#5F9E4A] focus:outline-none"
        />
      </div>

      {error && (
        <div className="max-w-md mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const state = getPlanState(plan);
          const isJunior = plan.name.toUpperCase().includes("JUNIOR");
          const isGold = plan.name.toUpperCase().includes("GOLD");
          const isCurrent = state === "current";
          const isUnavailable = state === "unavailable";
          const isUpgrade = state === "upgrade";
          const isDowngrade = state === "downgrade";
          const { credit, amountDue } = isUpgrade && currentMembership ? getUpgradeDetails(plan) : { credit: 0, amountDue: plan.price };

          return (
            <div
              key={plan.id}
              onClick={() => !isCurrent && !isUnavailable && handleSelectPlan(plan.id)}
              className={`relative rounded-[28px] p-7 flex flex-col justify-between border transition-all ${
                isCurrent
                  ? "bg-[#F6F5E1] border-[#5F9E4A] opacity-80 cursor-not-allowed"
                  : isUnavailable
                  ? "bg-white border-[#1B1B1B]/10 opacity-50 cursor-not-allowed"
                  : "bg-white border-[#1B1B1B]/15 hover:border-[#5F9E4A] hover:shadow-md cursor-pointer"
              }`}
            >
              {isGold && !isCurrent && (
                <div className="absolute -top-3 right-6 bg-[#E8883A] text-[#1B1B1B] text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-2xs">
                  MOST POPULAR
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-6 bg-[#5F9E4A] text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-2xs">
                  CURRENT PLAN
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-2xl font-bold tracking-tight text-[#1B1B1B]">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#1B1B1B]">
                    {fmtRs(plan.price)}
                  </span>
                  <span className="text-xs text-gray-500">/ {plan.durationDays} days</span>
                </div>

                <div className="pt-4 border-t border-[#1B1B1B]/15 space-y-2.5 text-xs text-[#1B1B1B]/80">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#5F9E4A]" />
                    <span><strong>{plan.courtDiscountPct}% OFF</strong> all Court bookings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#5F9E4A]" />
                    <span><strong>{plan.shopDiscountPct}% OFF</strong> Pro Shop merchandise</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#5F9E4A]" />
                    <span><strong>{plan.barDiscountPct}% OFF</strong> Champions Bar &amp; Cafe</span>
                  </div>
                </div>
              </div>

              {/* CTA label */}
              <div className="mt-6 pt-4">
                {isCurrent ? (
                  <div className="w-full py-2.5 rounded-full bg-[#5F9E4A]/15 text-[#5F9E4A] text-xs font-bold text-center">
                    ✓ You are on this plan
                  </div>
                ) : isUnavailable ? (
                  <div className="w-full py-2.5 rounded-full bg-[#1B1B1B]/10 text-[#1B1B1B]/40 text-xs font-bold text-center">
                    {isJunior ? "Only for members under 18" : "Not available"}
                  </div>
                ) : isUpgrade ? (
                  <div className="w-full py-2.5 rounded-full bg-[#1B1B1B] text-[#F6F5E1] text-xs font-bold text-center">
                    {currentMembership
                      ? `Upgrade — Pay ${fmtRs(amountDue)}${credit > 0 ? ` (after ${fmtRs(credit)} credit)` : ""}`
                      : "Select this plan →"}
                  </div>
                ) : (
                  <div className="w-full py-2.5 rounded-full bg-[#F6F5E1] text-[#1B1B1B] border border-[#1B1B1B]/20 text-xs font-bold text-center">
                    Downgrade — starts {currentMembership ? fmtDate(currentMembership.endsAt) : "on expiry"}
                  </div>
                )}
              </div>

              {/* Upgrade breakdown pill */}
              {isUpgrade && currentMembership && credit > 0 && (
                <div className="mt-2 flex items-start gap-1.5 text-[11px] text-[#1B1B1B]/50">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    {fmtRs(plan.price)} − {fmtRs(credit)} credit = {fmtRs(amountDue)} due now
                  </span>
                </div>
              )}
              {isDowngrade && currentMembership && (
                <div className="mt-2 flex items-start gap-1.5 text-[11px] text-[#1B1B1B]/50">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>Nothing to pay now. Scheduled for {fmtDate(currentMembership.endsAt)}.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Skip / action */}
      <div className="pt-6 border-t border-[#1B1B1B]/15 flex items-center justify-start">
        <Link prefetch={false} href="/member" className="text-xs font-semibold text-[#1B1B1B]/70 hover:text-[#1B1B1B] transition-colors py-2 px-4">
          ← Back to dashboard
        </Link>
      </div>

      {/* Confirm Dialog */}
      {showConfirm && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-md bg-[#F6F5E1] rounded-3xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-4 duration-200">
            <h3 className="text-lg font-extrabold text-[#1B1B1B]">Confirm plan change</h3>

            {(() => {
              const st = getPlanState(selectedPlan);
              const { credit, amountDue } = st === "upgrade" && currentMembership
                ? getUpgradeDetails(selectedPlan)
                : { credit: 0, amountDue: selectedPlan.price };
              return (
                <div className="bg-white rounded-2xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#1B1B1B]/60">New plan</span>
                    <span className="font-bold">{selectedPlan.name}</span>
                  </div>
                  {st === "upgrade" && currentMembership ? (
                    <>
                      <div className="flex justify-between text-[#1B1B1B]/60">
                        <span>New plan price</span>
                        <span>{fmtRs(selectedPlan.price)}</span>
                      </div>
                      <div className="flex justify-between text-[#5F9E4A] font-semibold">
                        <span>Credit from current plan</span>
                        <span>− {fmtRs(credit)}</span>
                      </div>
                      <div className="flex justify-between font-extrabold text-[#1B1B1B] text-base pt-1 border-t border-[#1B1B1B]/10">
                        <span>Amount due now</span>
                        <span>{fmtRs(amountDue)}</span>
                      </div>
                    </>
                  ) : st === "downgrade" && currentMembership ? (
                    <>
                      <div className="flex justify-between text-[#1B1B1B]/60">
                        <span>Amount due now</span>
                        <span className="font-bold text-[#5F9E4A]">Rs 0</span>
                      </div>
                      <div className="flex justify-between text-[#1B1B1B]/60">
                        <span>Starts on</span>
                        <span className="font-bold">{fmtDate(currentMembership.endsAt)}</span>
                      </div>
                      <p className="text-xs text-[#1B1B1B]/50 pt-1">
                        You keep your current {currentMembership.planName} benefits until {fmtDate(currentMembership.endsAt)}.
                      </p>
                    </>
                  ) : (
                    <div className="flex justify-between font-extrabold text-[#1B1B1B] text-base">
                      <span>Amount due</span>
                      <span>{fmtRs(selectedPlan.price)}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 min-h-[48px] rounded-2xl border border-[#1B1B1B]/20 text-[#1B1B1B] font-bold text-sm cursor-pointer hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 min-h-[48px] rounded-2xl bg-[#1B1B1B] text-[#F6F5E1] font-bold text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Confirm <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
