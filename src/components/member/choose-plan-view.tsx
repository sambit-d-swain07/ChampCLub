"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { choosePlanAction } from "@/app/actions/members";
import { Trophy, Check, ArrowRight, Loader2, Sparkles, Shield, AlertCircle } from "lucide-react";

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
    // Junior is shown ONLY if DOB is specified and age < 18
    return isJuniorEligible;
  });

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const chosenPlan = plans.find((p) => p.id === selectedPlanId);
    if (chosenPlan?.name.toUpperCase().includes("JUNIOR")) {
      if (!dob) {
        setError("Please enter your date of birth to verify eligibility for the Junior plan.");
        return;
      }
      if (!isJuniorEligible) {
        setError("The Junior plan is restricted to members under 18 years of age.");
        return;
      }
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("planId", selectedPlanId);
      if (dob) formData.set("dob", dob);

      const res = await choosePlanAction(formData);
      if (!res.success) {
        setError(res.error || "Failed to activate membership.");
        return;
      }

      router.push("/member");
      router.refresh();
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0E4433] border border-[#C8F13A]/30 text-xs font-semibold tracking-wider text-[#C8F13A]">
          <Sparkles className="h-3.5 w-3.5" /> WELCOME TO THE CLUB, {userName.toUpperCase()}
        </div>
        <h1 className="text-5xl sm:text-7xl font-display uppercase tracking-tight text-[#F4F1EA]">
          SELECT <span className="font-serif italic lowercase text-[#C8F13A] font-normal">your</span> MEMBERSHIP
        </h1>
        <p className="text-sm max-w-xl mx-auto text-[#F4F1EA]/70">
          Unlock prioritized booking windows, tournament-grade court privileges, and tiered member discounts at our Pro Shop and Champions Bar.
        </p>
      </div>

      {/* Date of Birth Verification Strip */}
      <div className="max-w-md mx-auto bg-[#0E4433] border border-white/10 rounded-2xl p-5 shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="dob" className="text-xs font-semibold uppercase tracking-wider text-[#F4F1EA]/80">
            Date of Birth
          </label>
          {currentAge !== null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isJuniorEligible ? "bg-[#C8F13A] text-[#07271D]" : "bg-white/10 text-[#F4F1EA]"}`}>
              Age: {currentAge} yrs {isJuniorEligible ? "• Junior Eligible" : "• Adult"}
            </span>
          )}
        </div>
        <input
          id="dob"
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="w-full h-11 px-4 rounded-xl bg-[#07271D] border border-white/15 text-[#F4F1EA] text-sm focus:border-[#C8F13A] focus:outline-none"
        />
        <p className="text-[11px] text-[#F4F1EA]/60">
          {currentAge === null
            ? "Enter date of birth to unlock the Junior Membership plan (under 18 only)."
            : isJuniorEligible
            ? "✓ Junior plan unlocked below for athletes under 18."
            : "Adult status verified. Junior plan is reserved for youth athletes under 18."}
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
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
              className={`relative rounded-3xl p-7 transition-all cursor-pointer flex flex-col justify-between border ${
                isSelected
                  ? "bg-[#0E4433] border-[#C8F13A] ring-2 ring-[#C8F13A]/50 shadow-2xl scale-[1.02]"
                  : "bg-[#07271D]/80 border-white/10 hover:border-white/30"
              }`}
            >
              {isGold && (
                <div className="absolute -top-3 right-6 bg-[#C8F13A] text-[#07271D] text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow">
                  MOST POPULAR
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-display uppercase tracking-wider text-[#F4F1EA]">
                    {plan.name}
                  </h3>
                  <div
                    className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-[#C8F13A] border-[#C8F13A] text-[#07271D]"
                        : "border-white/30"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-[#F4F1EA]">
                    ₹{plan.price.toLocaleString("en-IN")}
                  </span>
                  <span className="text-xs text-[#F4F1EA]/60">
                    / {plan.durationDays} days
                  </span>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs text-[#F4F1EA]/80">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#C8F13A]" />
                    <span><strong>{plan.courtDiscountPct}% OFF</strong> all Court bookings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#C8F13A]" />
                    <span><strong>{plan.shopDiscountPct}% OFF</strong> Pro Shop merchandise</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#C8F13A]" />
                    <span><strong>{plan.barDiscountPct}% OFF</strong> Champions Bar & Cafe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#C8F13A]" />
                    <span>Daily quota: <strong>{isGold ? "4 slots/day" : "2 slots/day"}</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4">
                <div
                  className={`w-full py-2.5 rounded-full text-center text-xs font-bold tracking-wider uppercase transition-colors ${
                    isSelected
                      ? "bg-[#C8F13A] text-[#07271D]"
                      : "bg-white/10 text-[#F4F1EA]/80"
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
      <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/member"
          className="text-xs font-semibold text-[#F4F1EA]/60 hover:text-[#C8F13A] transition-colors py-2 px-4"
        >
          Skip for now (continue as walk-in member) →
        </Link>

        <button
          onClick={handleCheckout}
          disabled={isPending || !selectedPlanId}
          className="w-full sm:w-auto px-8 h-12 rounded-full font-bold text-sm tracking-wide bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 cursor-pointer"
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

      <p className="text-[11px] text-center text-[#F4F1EA]/40">
        Demo checkout simulator: no real payment gateway will be charged. Payment is recorded in the club ledger as ONLINE method.
      </p>
    </div>
  );
}
