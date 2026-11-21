import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Membership Plans | The Champions Club",
  description:
    "Choose the Champions Club membership plan that fits your game — Gold, Silver, or Junior. All plans include court discounts, pro shop benefits, and bar privileges.",
};

export const dynamic = "force-dynamic";

function formatPrice(price: number, durationDays: number) {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
  const period = durationDays >= 365 ? "/ year" : durationDays >= 180 ? "/ 6 months" : `/ ${durationDays} days`;
  return { formatted, period };
}

function planBenefits(plan: {
  courtDiscountPct: unknown;
  shopDiscountPct: unknown;
  barDiscountPct: unknown;
  name: string;
}) {
  const court = Number(plan.courtDiscountPct);
  const shop = Number(plan.shopDiscountPct);
  const bar = Number(plan.barDiscountPct);
  const benefits: string[] = [];
  if (court > 0) benefits.push(`${court}% Court Booking Discount`);
  if (shop > 0) benefits.push(`${shop}% Pro Shop Discount`);
  if (bar > 0) benefits.push(`${bar}% Champions Bar Discount`);
  if (plan.name.toUpperCase().includes("GOLD")) {
    benefits.push("Fast-Track QR Turnstile Pass");
    benefits.push("Priority court reservations");
  } else if (plan.name.toUpperCase().includes("SILVER")) {
    benefits.push("Standard QR Turnstile Pass");
  }
  if (plan.name.toUpperCase().includes("JUNIOR")) {
    benefits.push("Junior Academy coaching access");
  }
  return benefits;
}

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({ orderBy: { price: "desc" } });

  return (
    <div>
      {/* Hero */}
      <section
        className="py-16 px-6 text-center"
        style={{ background: "linear-gradient(135deg, #0F2A1F, #1A3D2B)" }}
      >
        <h1
          className="text-4xl sm:text-5xl font-black text-white tracking-tight"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          Membership Plans
        </h1>
        <p className="mt-4 text-[#74C69D] text-sm max-w-md mx-auto">
          Invest in your game. Every plan unlocks exclusive member rates across courts, the pro
          shop, and the bar.
        </p>
      </section>

      {/* Plans grid */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        {plans.length === 0 ? (
          <div className="text-center py-20 text-gray-500 text-sm">
            Plans coming soon. Contact us for membership details.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan, idx) => {
              const isPopular = idx === 0;
              const { formatted, period } = formatPrice(
                Number(plan.price),
                plan.durationDays
              );
              const benefits = planBenefits(plan);

              return (
                <div
                  key={plan.id}
                  className="rounded-xl overflow-hidden relative flex flex-col"
                  style={{
                    border: isPopular ? "2px solid #2D6A4F" : "1px solid #2D6A4F22",
                    background: "#fff",
                    boxShadow: isPopular ? "0 4px 24px rgba(45,106,79,0.15)" : undefined,
                  }}
                >
                  {isPopular && (
                    <div
                      className="text-center py-1.5 text-xs font-bold tracking-wide"
                      style={{ background: "#2D6A4F", color: "#74C69D" }}
                    >
                      Most Popular
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="text-xs font-semibold text-[#2D6A4F] mb-1 uppercase tracking-wide">
                      {plan.name}
                    </div>
                    <div className="mt-1 mb-5">
                      <span className="text-4xl font-black text-[#0F2A1F]">{formatted}</span>
                      <span className="text-xs text-gray-400 ml-1">{period}</span>
                    </div>

                    <ul className="space-y-2.5 flex-1">
                      {benefits.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle2
                            className="h-4 w-4 flex-shrink-0"
                            style={{ color: "#2D6A4F" }}
                          />
                          {b}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6 space-y-2">
                      <Link
                        href="/signup"
                        className="block text-center py-2.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90"
                        style={{ background: "#0F2A1F", color: "#74C69D" }}
                      >
                        Apply for Membership
                      </Link>
                      <Link
                        href="/login?redirect=/member/book"
                        className="block text-center py-2.5 rounded-lg text-xs font-bold border transition-colors hover:bg-[#F0F4EF]"
                        style={{ borderColor: "#2D6A4F", color: "#0F2A1F" }}
                      >
                        Book a Court
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FAQ strip */}
      <section className="py-14 px-6" style={{ background: "#F0F4EF" }}>
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-xl font-bold text-[#0F2A1F]">Common questions</h2>
          {[
            [
              "Can I book courts without a plan?",
              "Yes — guests and walk-in members can book courts directly at standard non-member rates.",
            ],
            [
              "Are there family or couple plans?",
              "We offer group rates for families of 3 or more. Contact our concierge to discuss custom club packages.",
            ],
            [
              "What's included in the court discount?",
              "The discount applies to all bookable time slots across Tennis, Padel, and Badminton courts.",
            ],
          ].map(([q, a]) => (
            <div key={q} className="rounded-xl bg-white border border-[#2D6A4F]/15 p-5">
              <div className="font-semibold text-sm text-[#0F2A1F] mb-1.5">{q}</div>
              <div className="text-xs text-gray-600 leading-relaxed">{a}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
