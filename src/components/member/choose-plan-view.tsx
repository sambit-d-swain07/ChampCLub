"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { choosePlanAction } from "@/app/actions/members";
import { Check, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { formatInr } from "@/lib/site-settings";

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
  memberDob?: string | null;
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
    if (!currentMembership) return "upgrade";
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
        setError(res.error || "Failed to update plan");
        return;
      }

      setShowConfirm(false);
      setResult({
        scheduled: res.scheduled,
        startsOn: res.startsOn,
        planName: res.planName,
        upgraded: res.upgraded,
        amountDue: res.amountDue,
        credit: res.credit,
      });
    });
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto py-12 px-6">
        <div className="bg-white border border-[#E6E6E6] rounded-[20px] p-8 sm:p-10 text-center space-y-6 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-[#1F4A33] text-white flex items-center justify-center mx-auto">
            <Check className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="font-anton text-3xl sm:text-4xl uppercase text-[#111111]">
              {result.scheduled ? "Downgrade Scheduled" : "Membership Activated"}
            </h2>
            <p className="text-sm text-[#6B6B6B]">
              {result.scheduled
                ? `Your downgrade to ${result.planName} will automatically take effect on ${fmtDate(result.startsOn!)}.`
                : `You are now on the ${result.planName} membership tier with full privileges.`}
            </p>
          </div>

          {result.upgraded && result.amountDue !== undefined && (
            <div className="bg-[#EFEFEF] rounded-[14px] p-4 text-xs space-y-1.5 text-left">
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Previous Plan Credit:</span>
                <span className="font-semibold text-[#111111]">{formatInr(result.credit)}</span>
              </div>
              <div className="flex justify-between text-[#6B6B6B]">
                <span>Net Amount Paid:</span>
                <span className="font-bold text-[#111111]">{formatInr(result.amountDue)}</span>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              href="/member"
              className="flex-1 h-11 rounded-full bg-[#1F4A33] hover:bg-[#163826] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center transition-colors"
            >
              Go to Member Portal
            </Link>
            <Link
              href="/member/book"
              className="flex-1 h-11 rounded-full border border-[#E6E6E6] text-[#111111] hover:bg-[#EFEFEF] text-xs font-semibold uppercase tracking-wider flex items-center justify-center transition-colors"
            >
              Book a Court
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 text-[#111111] py-8 px-4">
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
          MEMBERSHIP PRIVILEGES
        </span>
        <h1 className="font-anton text-4xl sm:text-5xl uppercase leading-none text-[#111111]">
          {currentMembership ? "CHANGE YOUR MEMBERSHIP" : "SELECT YOUR MEMBERSHIP"}
        </h1>
        <p className="text-xs sm:text-sm text-[#6B6B6B] max-w-lg mx-auto">
          {currentMembership
            ? `Hello ${userName}, upgrade immediately or schedule a plan change.`
            : `Hello ${userName}, choose a tier below for automated discounts across courts, Pro Shop and clubhouse bar.`}
        </p>
      </div>

      {/* Date of Birth prompt for unverified accounts */}
      {!memberDob && (
        <div className="max-w-md mx-auto bg-white border border-[#E6E6E6] rounded-[16px] p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="dob-prompt" className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B]">
              Date of Birth (required for Junior)
            </label>
            {currentAge !== null && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isJuniorEligible ? "bg-[#1F4A33] text-white" : "bg-[#EFEFEF] text-[#111111]"}`}>
                Age: {currentAge} yrs {isJuniorEligible ? "· Junior eligible" : "· Adult"}
              </span>
            )}
          </div>
          <input
            id="dob-prompt"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            min={(() => {
              const d = new Date();
              d.setFullYear(d.getFullYear() - 100);
              return d.toISOString().split("T")[0];
            })()}
            max={new Date().toISOString().split("T")[0]}
            className="w-full h-11 px-4 rounded-[14px] bg-white border border-[#E6E6E6] text-sm text-[#111111] focus:ring-1 focus:ring-[#1F4A33] focus:border-[#1F4A33] focus:outline-none"
          />
        </div>
      )}

      {error && (
        <div className="max-w-md mx-auto p-4 rounded-[14px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 items-stretch">
        {plans.map((plan) => {
          const state = getPlanState(plan);
          const isGold = plan.name.toUpperCase().includes("GOLD");
          const isJunior = plan.name.toUpperCase().includes("JUNIOR");
          const isCurrent = state === "current";
          const isUnavailable = state === "unavailable";
          const isUpgrade = state === "upgrade";
          const { credit, amountDue } = isUpgrade && currentMembership ? getUpgradeDetails(plan) : { credit: 0, amountDue: plan.price };

          return (
            <div
              key={plan.id}
              onClick={() => !isCurrent && !isUnavailable && handleSelectPlan(plan.id)}
              className={`rounded-[14px] p-8 flex flex-col justify-between transition-all ${
                isGold && !isCurrent
                  ? "bg-[#1F4A33] text-white shadow-xl cursor-pointer"
                  : isCurrent
                  ? "bg-[#EFEFEF] border border-[#111111] opacity-90 cursor-default"
                  : isUnavailable
                  ? "bg-white border border-[#E6E6E6] opacity-40 cursor-not-allowed"
                  : "bg-white border border-[#E6E6E6] text-[#111111] hover:border-[#111111] cursor-pointer"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${isGold && !isCurrent ? "text-white/80" : "text-[#6B6B6B]"}`}>
                    {plan.name} PLAN
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#111111] text-white">
                      Current
                    </span>
                  )}
                  {isGold && !isCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                      Featured
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-anton text-[48px] leading-none">
                    {formatInr(plan.price)}
                  </span>
                  <span className={`text-xs ${isGold && !isCurrent ? "text-white/70" : "text-[#6B6B6B]"}`}>
                    / {plan.durationDays >= 365 ? "365 days" : `${plan.durationDays} days`}
                  </span>
                </div>

                <div className={`my-6 border-t ${isGold && !isCurrent ? "border-white/20" : "border-[#E6E6E6]"}`} />

                <ul className="space-y-3 text-xs leading-relaxed">
                  <li className="flex items-center justify-between">
                    <span className={isGold && !isCurrent ? "text-white/80" : "text-[#6B6B6B]"}>Courts discount</span>
                    <span className="font-semibold">{Number(plan.courtDiscountPct)}% off</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className={isGold && !isCurrent ? "text-white/80" : "text-[#6B6B6B]"}>Pro Shop gear</span>
                    <span className="font-semibold">{Number(plan.shopDiscountPct)}% off</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className={isGold && !isCurrent ? "text-white/80" : "text-[#6B6B6B]"}>Champions Bar</span>
                    <span className="font-semibold">{Number(plan.barDiscountPct)}% off</span>
                  </li>
                </ul>

                {isJunior && (
                  <p className={`text-xs mt-4 pt-4 border-t ${isGold && !isCurrent ? "border-white/20 text-white/80" : "border-[#E6E6E6] text-[#6B6B6B]"}`}>
                    {isUnavailable ? "Junior is for under 18." : "For under 18. Age verified at the front desk."}
                  </p>
                )}
              </div>

              <div className="mt-8 pt-4">
                <button
                  type="button"
                  disabled={isCurrent || isUnavailable}
                  className={`w-full h-11 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all ${
                    isCurrent
                      ? "bg-[#111111] text-white opacity-60 cursor-default"
                      : isUnavailable
                      ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                      : isGold
                      ? "bg-white text-[#1F4A33] hover:bg-neutral-100 cursor-pointer"
                      : "bg-[#111111] text-white hover:bg-black cursor-pointer"
                  }`}
                >
                  {isCurrent
                    ? "Active Tier"
                    : isUnavailable
                    ? "Not Eligible"
                    : state === "upgrade" && currentMembership
                    ? `Upgrade (${formatInr(amountDue)})`
                    : state === "downgrade"
                    ? "Schedule Downgrade"
                    : `Choose ${plan.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[20px] max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <h3 className="font-anton text-2xl uppercase text-[#111111]">
              Confirm Plan Selection
            </h3>

            <div className="text-xs text-[#6B6B6B] space-y-2">
              <p>
                You are selecting the <strong className="text-[#111111]">{selectedPlan.name}</strong> membership tier.
              </p>
              {currentMembership && getPlanState(selectedPlan) === "upgrade" && (
                <div className="bg-[#EFEFEF] rounded-[14px] p-4 space-y-1.5 mt-2">
                  <div className="flex justify-between">
                    <span>New Plan Price:</span>
                    <span className="font-semibold text-[#111111]">{formatInr(selectedPlan.price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unused Credit:</span>
                    <span className="font-semibold text-[#111111]">-{formatInr(getUpgradeDetails(selectedPlan).credit)}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#E6E6E6] pt-1.5 font-bold text-[#111111]">
                    <span>Amount Due Today:</span>
                    <span>{formatInr(getUpgradeDetails(selectedPlan).amountDue)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 h-11 rounded-full border border-[#E6E6E6] text-xs font-semibold uppercase tracking-wider text-[#111111] hover:bg-[#EFEFEF] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="flex-1 h-11 rounded-full bg-[#1F4A33] hover:bg-[#163826] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Confirm</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
