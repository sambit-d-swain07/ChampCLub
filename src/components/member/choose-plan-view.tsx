"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { choosePlanAction } from "@/app/actions/members";
import { Check, ArrowRight, Loader2, Sparkles, AlertCircle } from "lucide-react";

interface PlanItem {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  courtDiscountPct: number;
  shopDiscountPct: number;
  barDiscountPct: number;
}

export function ChoosePlanView({
  plans,
  userName,
}: {
  plans: PlanItem[];
  userName: string;
}) {
  const router = useRouter();
  const [dob, setDob] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    plans.find((p) => p.name.toUpperCase().includes("GOLD"))?.id || plans[0]?.id || ""
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Calculate age based on Date of Birth
  const calculateAge = (dobString: string): number | null => {
    if (!dobString) return null;
    const birth = new Date(dobString);
    if (isNaN(birth.getTime())) return null;
    const diff = Date.now() - birth.getTime();
    const ageDt = new Date(diff);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
  };

  const currentAge = calculateAge(dob);
  const isJuniorEligible = currentAge !== null && currentAge < 18;

  // Filter plans: show Junior only if under 18 or DOB not entered yet
  const visiblePlans = plans.filter((p) => {
    const isJunior = p.name.toUpperCase().includes("JUNIOR");
    if (!isJunior) return true;
    return isJuniorEligible || currentAge === null;
  });

  const handleCheckout = () => {
    if (!selectedPlanId) return;
    setError(null);

    startTransition(async () => {
      const payload = new FormData();
      payload.set("planId", selectedPlanId);
      if (dob) payload.set("dob", dob);

      const res = await choosePlanAction(payload);
      if (!res.success) {
        setError(res.error || "Failed to process membership selection.");
        return;
      }

      router.push("/member");
      router.refresh();
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 text-[#1B1B1B]">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-[#1B1B1B]/15 text-xs font-semibold text-[#5F9E4A] shadow-2xs">
          <Sparkles className="h-3.5 w-3.5" /> WELCOME TO THE CHAMPIONS CLUB
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#1B1B1B]">
          Select your membership tier, {userName}
        </h1>
        <p className="text-xs sm:text-sm text-[#1B1B1B]/70 max-w-xl mx-auto">
          Choose a privilege tier below for automated discounts across courts, Pro Shop, and cafe. You can also skip and stay on walk-in rates.
        </p>
      </div>

      {/* Date of Birth Verification Strip */}
      <div className="max-w-md mx-auto bg-white border border-[#1B1B1B]/15 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="dob" className="text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/80">
            Date of Birth
          </label>
          {currentAge !== null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isJuniorEligible ? "bg-[#E8883A] text-[#1B1B1B]" : "bg-[#EDECCF] text-[#1B1B1B]"}`}>
              Age: {currentAge} yrs {isJuniorEligible ? "• Junior Eligible" : "• Adult"}
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
        <p className="text-[11px] text-gray-500">
          {currentAge === null
            ? "Enter date of birth to unlock the Junior Membership plan (under 18 only)."
            : isJuniorEligible
            ? "✓ Junior plan unlocked below for athletes under 18."
            : "Adult status verified. Junior plan is reserved for youth athletes under 18."}
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {visiblePlans.map((plan) => {
          const isSelected = selectedPlanId === plan.id;
          const isGold = plan.name.toUpperCase().includes("GOLD");

          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`relative rounded-[28px] p-7 transition-all cursor-pointer flex flex-col justify-between border ${
                isSelected
                  ? "bg-white border-[#5F9E4A] ring-2 ring-[#5F9E4A]/30 shadow-md scale-[1.02]"
                  : "bg-white border-[#1B1B1B]/15 hover:border-[#1B1B1B]/40"
              }`}
            >
              {isGold && (
                <div className="absolute -top-3 right-6 bg-[#E8883A] text-[#1B1B1B] text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-2xs">
                  MOST POPULAR
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold tracking-tight text-[#1B1B1B]">
                    {plan.name}
                  </h3>
                  <div
                    className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-[#5F9E4A] border-[#5F9E4A] text-white"
                        : "border-[#1B1B1B]/30"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#1B1B1B]">
                    ₹{plan.price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-gray-500">
                    / {plan.durationDays} days
                  </span>
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
                    <span><strong>{plan.barDiscountPct}% OFF</strong> Champions Bar & Cafe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#5F9E4A]" />
                    <span>Daily quota: <strong>{isGold ? "4 slots/day" : "2 slots/day"}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <div
                  className={`w-full py-2.5 rounded-full text-center text-xs font-bold tracking-wider uppercase transition-colors ${
                    isSelected
                      ? "bg-[#1B1B1B] text-[#F6F5E1]"
                      : "bg-[#F6F5E1] text-[#1B1B1B] hover:bg-[#EDECCF]"
                  }`}
                >
                  {isSelected ? "Selected Tier" : "Select Plan"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Strip: Demo Checkout & Skip */}
      <div className="pt-6 border-t border-[#1B1B1B]/15 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/member"
          className="text-xs font-semibold text-[#1B1B1B]/70 hover:text-[#1B1B1B] transition-colors py-2 px-4"
        >
          Skip for now (continue as walk-in member) →
        </Link>

        <button
          onClick={handleCheckout}
          disabled={isPending || !selectedPlanId}
          className="w-full sm:w-auto px-8 h-12 rounded-full font-bold text-sm tracking-wide bg-[#1B1B1B] hover:bg-black text-[#F6F5E1] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing Demo Checkout...
            </>
          ) : (
            <>
              <span>Demo Checkout (Online Method)</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <p className="text-[11px] text-center text-gray-500">
        Demo checkout simulator: no real payment gateway will be charged. Payment is recorded in the club ledger as ONLINE method.
      </p>
    </div>
  );
}
