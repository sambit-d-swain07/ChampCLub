import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PublicNavbar } from "@/components/public/public-navbar";
import { CourtIllustration } from "@/components/public/court-illustration";
import { WeekAvailabilityStrip } from "@/components/public/week-availability-strip";
import { ContactForm } from "@/components/public/contact-form";
import { getCourtAvailability, formatKolkataDate } from "@/lib/services/booking";
import {
  Trophy,
  ArrowRight,
  Sparkles,
  Check,
  MapPin,
  Clock,
  Phone,
  Mail,
  Zap,
  ShieldCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The Champions Club — Premier Racquet & Sports Club Bengaluru",
  description:
    "Experience tournament-grade Tennis, panoramic Padel, and BWF-standard Badminton courts in Bengaluru. World-class sports amenities, artisanal lounge, and member perks.",
  openGraph: {
    title: "The Champions Club | Premier Racquet Sports",
    description:
      "Championship Tennis, panoramic Padel, and BWF Badminton courts in Bengaluru. Book your session or apply for membership today.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 1. Fetch DB Plans
  const plans = await prisma.plan.findMany({
    orderBy: { price: "desc" },
  });

  // 2. Fetch 6 Featured Products for Shop Preview
  const products = await prisma.product.findMany({
    take: 6,
    orderBy: { name: "asc" },
  });

  // 3. Build 7-day availability strip
  const today = new Date();
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = formatKolkataDate(targetDate);
    const dayName =
      i === 0
        ? "Today"
        : i === 1
        ? "Tomorrow"
        : targetDate.toLocaleDateString("en-US", { weekday: "short" });
    const formattedDate = targetDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    try {
      const avail = await getCourtAvailability(dateStr);
      let freeSlotsCount = 0;
      const featuredSlots: Array<{ courtName: string; sport: string; time: string }> = [];

      for (const row of avail.rows) {
        for (const cs of row.courts) {
          if (cs.status === "FREE") {
            freeSlotsCount++;
            if (featuredSlots.length < 6) {
              const court = avail.courts.find((c) => c.id === cs.courtId);
              featuredSlots.push({
                courtName: court?.name || "Court",
                sport: court?.sport || "SPORT",
                time: row.startTimeStr,
              });
            }
          }
        }
      }

      weekDays.push({
        dateStr,
        dayLabel: dayName,
        formattedDate,
        freeSlotsCount,
        featuredSlots,
      });
    } catch {
      weekDays.push({
        dateStr,
        dayLabel: dayName,
        formattedDate,
        freeSlotsCount: 12,
        featuredSlots: [],
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B3B2C] text-[#F4F1EA]">
      {/* Navbar */}
      <PublicNavbar />

      {/* 1. HERO SECTION */}
      <section className="relative px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 max-w-7xl mx-auto w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0E4433] border border-[#C8F13A]/30 text-xs font-semibold tracking-wider text-[#C8F13A]">
          <Sparkles className="h-3.5 w-3.5" /> BENGALURU&apos;S PREMIER RACQUET DESTINATION
        </div>

        <h1 className="text-6xl sm:text-8xl md:text-9xl font-display uppercase tracking-tight text-[#F4F1EA] leading-[0.9]">
          PRECISION <span className="font-serif italic lowercase text-[#C8F13A] font-normal">sporting</span> LUXURY
        </h1>

        <p className="text-sm sm:text-base max-w-2xl mx-auto text-[#F4F1EA]/70 leading-relaxed font-sans">
          Championship Plexipave tennis courts, Spanish panoramic glass padel arenas, and Olympic-grade teakwood badminton halls. Book your court or join our sports fraternity.
        </p>

        {/* Hero CTA Buttons: "Book a Court" and "Sign up" */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/login?redirect=/member/book"
            className="px-8 h-12 rounded-full font-bold text-sm tracking-wide bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-105"
          >
            <span>Book a Court</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/signup"
            className="px-8 h-12 rounded-full font-bold text-sm tracking-wide text-[#F4F1EA] hover:text-[#C8F13A] border border-white/25 hover:border-[#C8F13A] transition-all flex items-center justify-center gap-2"
          >
            Sign up
          </Link>
        </div>

        {/* Reference 2 Original Court Illustration */}
        <div className="pt-8">
          <CourtIllustration />
        </div>
      </section>

      {/* 2. THIS WEEK'S AVAILABILITY STRIP */}
      <section id="availability" className="py-20 px-6 bg-[#07271D] border-t border-b border-white/10">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#C8F13A] block mb-1">
                LIVE BOOKING ENGINE
              </span>
              <h2 className="text-4xl sm:text-5xl font-display uppercase tracking-wider text-[#F4F1EA]">
                THIS WEEK&apos;S <span className="font-serif italic lowercase text-[#C8F13A] font-normal">court</span> SCHEDULE
              </h2>
            </div>
            <p className="text-xs text-[#F4F1EA]/60 max-w-md">
              Real-time court availability across Tennis, Padel, and Badminton. Select any day or slot to lock in your match time.
            </p>
          </div>

          <WeekAvailabilityStrip days={weekDays} />
        </div>
      </section>

      {/* 3. FACILITIES & COURTS */}
      <section id="facilities" className="py-20 px-6 max-w-7xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C8F13A] block">
            WORLD-CLASS SPECIFICATIONS
          </span>
          <h2 className="text-5xl sm:text-6xl font-display uppercase tracking-tight text-[#F4F1EA]">
            THE <span className="font-serif italic lowercase text-[#C8F13A] font-normal">championship</span> COURTS
          </h2>
          <p className="text-xs sm:text-sm text-[#F4F1EA]/70">
            Engineered to tournament standards with non-glare LED illumination, high-shock absorption surfaces, and acoustic comfort.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Tennis */}
          <div className="rounded-3xl p-8 bg-[#0E4433] border border-white/10 shadow-xl space-y-4 hover:border-[#C8F13A]/50 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#6FB3E0]">
              <Trophy className="h-6 w-6" />
            </div>
            <h3 className="text-3xl font-display uppercase tracking-wider text-[#F4F1EA]">
              CHAMPIONSHIP TENNIS
            </h3>
            <p className="text-xs text-[#F4F1EA]/70 leading-relaxed">
              2 tournament-grade acrylic cushion hardcourts with 1000-lux anti-glare floodlights. Optimized true bounce for singles and doubles play.
            </p>
            <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-[#F4F1EA]/80">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C8F13A]" /> ITF Class 3 Medium-Paced Acrylic
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C8F13A]" /> 8-head tournament LED illumination
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C8F13A]" /> Ball machine & coaching rentals
              </div>
            </div>
          </div>

          {/* Padel */}
          <div className="rounded-3xl p-8 bg-[#0E4433] border border-white/10 shadow-xl space-y-4 hover:border-[#C8F13A]/50 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#C8F13A]">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-3xl font-display uppercase tracking-wider text-[#F4F1EA]">
              PANORAMIC PADEL
            </h3>
            <p className="text-xs text-[#F4F1EA]/70 leading-relaxed">
              2 European panoramic glass arenas with texturized monofilament turf. 4-player high-intensity social and competitive format.
            </p>
            <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-[#F4F1EA]/80">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C8F13A]" /> 12mm tempered safety glass walls
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C8F13A]" /> Texturized Mondo supercourt turf
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C8F13A]" /> Friday evening social mixers
              </div>
            </div>
          </div>

          {/* Badminton */}
          <div className="rounded-3xl p-8 bg-[#0E4433] border border-white/10 shadow-xl space-y-4 hover:border-[#C8F13A]/50 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#FB923C]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-3xl font-display uppercase tracking-wider text-[#F4F1EA]">
              ELITE BADMINTON
            </h3>
            <p className="text-xs text-[#F4F1EA]/70 leading-relaxed">
              2 cushioned teakwood courts finished with BWF-certified anti-skid synthetic mats. Exceptional joint shock absorption and vertical clearance.
            </p>
            <div className="pt-4 border-t border-white/10 space-y-2 text-xs text-[#F4F1EA]/80">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C8F13A]" /> Teakwood sprung subfloor base
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C8F13A]" /> 9-meter ceiling clearance
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-[#C8F13A]" /> Draft-free climate ventilation
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MEMBERSHIP PLANS (FROM DATABASE) */}
      <section id="plans" className="py-20 px-6 bg-[#07271D] border-t border-b border-white/10">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C8F13A] block">
              ANNUAL PRIVILEGES
            </span>
            <h2 className="text-5xl sm:text-6xl font-display uppercase tracking-tight text-[#F4F1EA]">
              MEMBERSHIP <span className="font-serif italic lowercase text-[#C8F13A] font-normal">tiers</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#F4F1EA]/70">
              Select your privilege level. Enjoy tiered discounts across courts, pro shop gear, and the club cafeteria.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const isGold = plan.name.toUpperCase().includes("GOLD");
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-8 flex flex-col justify-between border ${
                    isGold
                      ? "bg-[#0E4433] border-[#C8F13A] ring-2 ring-[#C8F13A]/50 shadow-2xl"
                      : "bg-[#0B3B2C] border-white/10"
                  }`}
                >
                  {isGold && (
                    <div className="absolute -top-3.5 right-8 bg-[#C8F13A] text-[#07271D] text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow">
                      RECOMMENDED
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-3xl font-display uppercase tracking-wider text-[#F4F1EA]">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1 mt-3">
                        <span className="text-5xl font-extrabold text-[#F4F1EA]">
                          ₹{Number(plan.price).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-[#F4F1EA]/60">
                          / {plan.durationDays} days
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs text-[#F4F1EA]/80 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-[#C8F13A]" />
                        <span><strong>{Number(plan.courtDiscountPct)}% OFF</strong> court reservations</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-[#C8F13A]" />
                        <span><strong>{Number(plan.shopDiscountPct)}% OFF</strong> Pro Shop merchandise</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-[#C8F13A]" />
                        <span><strong>{Number(plan.barDiscountPct)}% OFF</strong> Champions Bar & Lounge</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-[#C8F13A]" />
                        <span>Daily Booking Quota: <strong>{isGold ? "4 slots/day" : "2 slots/day"}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4">
                    <Link
                      href="/signup"
                      className={`w-full h-12 rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                        isGold
                          ? "bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] shadow-lg"
                          : "bg-white/10 hover:bg-white/20 text-[#F4F1EA]"
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
        </div>
      </section>

      {/* 5. PRO SHOP PREVIEW (FROM DATABASE) */}
      <section id="shop" className="py-20 px-6 max-w-7xl mx-auto w-full space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#C8F13A] block mb-1">
              PRO-GRADE EQUIPMENT
            </span>
            <h2 className="text-4xl sm:text-5xl font-display uppercase tracking-wider text-[#F4F1EA]">
              CHAMPIONS <span className="font-serif italic lowercase text-[#C8F13A] font-normal">pro</span> SHOP
            </h2>
          </div>
          <Link
            href="/member/shop"
            className="text-xs font-bold text-[#C8F13A] hover:underline flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>Visit Full Pro Shop</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl p-4 bg-[#0E4433] border border-white/10 hover:border-[#C8F13A]/50 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C8F13A]">
                  {p.category}
                </span>
                <h4 className="text-xs font-bold text-[#F4F1EA] line-clamp-2">{p.name}</h4>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#F4F1EA]">
                  ₹{Number(p.price).toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-[#C8F13A] font-semibold">
                  {p.stockQty > 0 ? "In Stock" : "Backorder"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. VISIT THE CLUB & INQUIRIES SECTION */}
      <section id="contact" className="py-20 px-6 bg-[#07271D] border-t border-white/10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Club Info & Pitch */}
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#C8F13A] block">
              VISIT THE CLUB
            </span>
            <h2 className="text-5xl sm:text-6xl font-display uppercase tracking-tight text-[#F4F1EA]">
              EXPERIENCE <span className="font-serif italic lowercase text-[#C8F13A] font-normal">championship</span> CALIBER
            </h2>
            <p className="text-xs sm:text-sm text-[#F4F1EA]/70 leading-relaxed max-w-lg">
              Visit The Champions Club in the heart of Indiranagar. Experience our world-class courts, Pro Shop, and members lounge, or contact our concierge for corporate and private bookings.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 text-xs text-[#F4F1EA]/80">
                <MapPin className="h-5 w-5 text-[#C8F13A] shrink-0" />
                <span>124 Club Crescent, Indiranagar, Bengaluru, KA 560038</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#F4F1EA]/80">
                <Clock className="h-5 w-5 text-[#C8F13A] shrink-0" />
                <span>Open 7 Days a Week: 06:00 AM – 10:00 PM</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#F4F1EA]/80">
                <Phone className="h-5 w-5 text-[#C8F13A] shrink-0" />
                <span>+91 80 4910 8800 • Concierge & Inquiries</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#F4F1EA]/80">
                <Mail className="h-5 w-5 text-[#C8F13A] shrink-0" />
                <span>concierge@thechampionsclub.in</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 h-12 rounded-full font-bold text-xs uppercase tracking-wider bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all shadow-xl"
              >
                <span>Apply for Club Membership</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Contact & Inquiries Card */}
          <div className="rounded-3xl p-8 bg-[#0E4433] border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-2xl font-display uppercase tracking-wider text-[#F4F1EA]">
              CLUB CONCIERGE & INQUIRIES
            </h3>
            <p className="text-xs text-[#F4F1EA]/70">
              Interested in corporate tournament bookings, junior academy coaching, or private events? Send us a quick note.
            </p>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-12 px-6 bg-[#07271D] border-t border-white/10 text-xs text-[#F4F1EA]/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#C8F13A] text-[#07271D] flex items-center justify-center font-bold">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <span className="font-display uppercase text-lg tracking-wider text-[#F4F1EA] block leading-none">
                THE CHAMPIONS CLUB
              </span>
              <span className="text-[9px] text-[#C8F13A] font-semibold tracking-widest uppercase">
                EST. 2026 • BENGALURU
              </span>
            </div>
          </div>

          <div className="text-center sm:text-right space-y-0.5 text-[11px]">
            <div>Operating Daily: 06:00 AM – 10:00 PM (IST)</div>
            <div>© 2026 The Champions Club. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
