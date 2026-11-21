import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Trophy, Zap, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { PublicNavbar } from "@/components/public/public-navbar";

export const metadata: Metadata = {
  title: "The Champions Club — Premium Racquet & Sports Club",
  description:
    "World-class Tennis, Padel, and Badminton courts in the heart of the city. Book a free trial session today — no membership required.",
  openGraph: {
    title: "The Champions Club",
    description: "Premium racquet sports club. Book a free trial today.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const plans = await prisma.plan.findMany({ orderBy: { price: "desc" }, take: 3 });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0F2A1F" }}>
      {/* Responsive Nav */}
      <PublicNavbar />

      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center px-6 pt-24 pb-20 max-w-5xl mx-auto w-full">
        <div className="mb-4">
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: "rgba(116,198,157,0.12)", color: "#74C69D", border: "1px solid rgba(116,198,157,0.2)" }}
          >
            Bengaluru&apos;s Premier Racquet Club
          </span>
        </div>
        <h1
          className="text-5xl sm:text-7xl font-black tracking-tight leading-none mb-6"
          style={{ color: "#F0F4EF", fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          Play at a<br />
          <span style={{ color: "#74C69D" }}>higher level.</span>
        </h1>
        <p className="text-base max-w-lg leading-relaxed mb-8" style={{ color: "rgba(240,244,239,0.6)" }}>
          Championship Tennis, panoramic Padel, and teakwood Badminton courts — all in one place.
          Your first session is on us.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/trial"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm"
            style={{ background: "#74C69D", color: "#0F2A1F" }}
          >
            Book your free trial <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/facilities"
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm"
            style={{ color: "#74C69D", border: "1px solid rgba(116,198,157,0.25)" }}
          >
            See our courts
          </Link>
        </div>
      </section>

      {/* Sports strip */}
      <section style={{ background: "#1A3D2B", borderTop: "1px solid rgba(116,198,157,0.1)" }}>
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
          {[
            { icon: Trophy, label: "Championship Tennis", desc: "2 tournament-grade acrylic courts with floodlights. Dynamic peak/off-peak pricing.", color: "#60A5FA" },
            { icon: Zap, label: "Pro Padel Arenas", desc: "2 panoramic glass arenas — perfect for 4-player social play with instant video replay.", color: "#74C69D" },
            { icon: ShieldCheck, label: "Elite Badminton", desc: "2 shock-absorbing teakwood courts, BWF-certified lighting, and Yonex tournament shuttles.", color: "#C084FC" },
          ].map(({ icon: Icon, label, desc, color }) => (
            <div key={label} className="space-y-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <div className="font-bold text-base" style={{ color: "#F0F4EF" }}>{label}</div>
              <div className="text-sm leading-relaxed" style={{ color: "rgba(240,244,239,0.5)" }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Plans preview */}
      {plans.length > 0 && (
        <section style={{ background: "#0F2A1F", borderTop: "1px solid rgba(116,198,157,0.08)" }}>
          <div className="max-w-6xl mx-auto px-6 py-20">
            <div className="mb-10">
              <h2 className="text-2xl font-bold" style={{ color: "#F0F4EF" }}>Membership plans</h2>
              <p className="text-sm mt-2" style={{ color: "rgba(240,244,239,0.5)" }}>
                Unlock member rates across courts, the pro shop, and the bar.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl p-6 flex flex-col gap-4"
                  style={{ background: "#1A3D2B", border: "1px solid rgba(116,198,157,0.12)" }}
                >
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: "#74C69D" }}>{plan.name}</div>
                    <div className="text-3xl font-black" style={{ color: "#F0F4EF" }}>
                      ₹{Number(plan.price).toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(240,244,239,0.4)" }}>
                      for {plan.durationDays >= 365 ? "1 year" : `${plan.durationDays} days`}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {Number(plan.courtDiscountPct) > 0 && (
                      <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(240,244,239,0.65)" }}>
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#74C69D" }} />
                        {Number(plan.courtDiscountPct)}% court discount
                      </div>
                    )}
                    {Number(plan.shopDiscountPct) > 0 && (
                      <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(240,244,239,0.65)" }}>
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#74C69D" }} />
                        {Number(plan.shopDiscountPct)}% pro shop discount
                      </div>
                    )}
                    {Number(plan.barDiscountPct) > 0 && (
                      <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(240,244,239,0.65)" }}>
                        <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#74C69D" }} />
                        {Number(plan.barDiscountPct)}% bar discount
                      </div>
                    )}
                  </div>
                  <Link
                    href="/trial"
                    className="mt-auto block text-center py-2.5 rounded-lg text-xs font-bold"
                    style={{ background: "#2D6A4F", color: "#74C69D" }}
                  >
                    Try before you join
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link
                href="/plans"
                className="text-sm font-semibold flex items-center gap-2"
                style={{ color: "#74C69D" }}
              >
                Compare all plans <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        className="border-t py-8 px-6 text-center text-xs"
        style={{ borderColor: "rgba(116,198,157,0.1)", color: "rgba(240,244,239,0.3)", background: "#0A1F16" }}
      >
        <p>© 2026 The Champions Club · 24 Racquet Road, Bengaluru · +91 80 4567 8900</p>
        <p className="mt-2 space-x-4">
          <Link href="/facilities" style={{ color: "rgba(116,198,157,0.5)" }}>Facilities</Link>
          <Link href="/plans" style={{ color: "rgba(116,198,157,0.5)" }}>Plans</Link>
          <Link href="/trial" style={{ color: "rgba(116,198,157,0.5)" }}>Book Trial</Link>
          <Link href="/contact" style={{ color: "rgba(116,198,157,0.5)" }}>Contact</Link>
          <Link href="/login" style={{ color: "rgba(116,198,157,0.5)" }}>Staff Login</Link>
        </p>
      </footer>
    </div>
  );
}
