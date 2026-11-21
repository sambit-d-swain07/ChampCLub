import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Membership Plans | The Champions Club",
  description:
    "Choose the Champions Club membership plan that fits your game — Gold, Silver, or Junior. All plans include court discounts, pro shop benefits, and bar privileges.",
};

export const dynamic = "force-dynamic";

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
    benefits.push("Priority court reservations (4 slots/day)");
  } else if (plan.name.toUpperCase().includes("SILVER")) {
    benefits.push("Standard QR Turnstile Pass (2 slots/day)");
  }
  if (plan.name.toUpperCase().includes("JUNIOR")) {
    benefits.push("Junior Academy coaching access (under 18)");
  }
  return benefits;
}

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({ orderBy: { price: "desc" } });

  return (
    <div className="bg-[#F6F5E1] text-[#1B1B1B]">
      {/* Hero */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white border border-[#1B1B1B]/15 text-xs font-semibold text-[#5F9E4A] shadow-2xs">
          ANNUAL & SEASONAL PRIVILEGES
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#1B1B1B] tracking-tight">
          Membership Plans
        </h1>
        <p className="text-[#1B1B1B]/75 text-base max-w-xl mx-auto">
          Tiered membership with priority court access, pro shop merchandise discounts, and bar perks.
        </p>
      </section>

      {/* Cards */}
      <section className="py-8 pb-20 px-6 max-w-6xl mx-auto">
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((p) => {
            const isGold = p.name.toUpperCase().includes("GOLD");
            const benefits = planBenefits(p);

            return (
              <div
                key={p.id}
                className={`relative rounded-[28px] p-8 flex flex-col justify-between border bg-white ${
                  isGold
                    ? "border-[#5F9E4A] ring-2 ring-[#5F9E4A]/30 shadow-md"
                    : "border-[#1B1B1B]/15"
                }`}
              >
                {isGold && (
                  <div className="absolute -top-3 right-6 bg-[#E8883A] text-[#1B1B1B] text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-2xs">
                    MOST POPULAR
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-[#1B1B1B]">{p.name}</h3>
                    <div className="flex items-baseline gap-1 mt-3">
                      <span className="text-4xl sm:text-5xl font-extrabold text-[#1B1B1B]">
                        ₹{Number(p.price).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-gray-500">
                        / {p.durationDays} days
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3 text-xs text-[#1B1B1B]/80 pt-4 border-t border-[#1B1B1B]/15">
                    {benefits.map((b) => (
                      <li key={b} className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-[#5F9E4A] shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <Link
                    href="/signup"
                    className={`w-full h-12 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isGold
                        ? "bg-[#1B1B1B] hover:bg-black text-[#F6F5E1] shadow-md"
                        : "border border-[#1B1B1B]/30 hover:border-[#1B1B1B] text-[#1B1B1B] hover:bg-[#F6F5E1]"
                    }`}
                  >
                    <span>Join Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
