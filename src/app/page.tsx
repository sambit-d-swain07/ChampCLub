import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HeroSection } from "@/components/public/hero-section";
import { WeekAvailabilityStrip } from "@/components/public/week-availability-strip";
import { ContactForm } from "@/components/public/contact-form";
import { getCourtAvailability, formatKolkataDate } from "@/lib/services/booking";
import {
  Trophy,
  ArrowRight,
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

  // 2. Fetch Featured Products from Database
  const products = await prisma.product.findMany({
    take: 6,
    orderBy: { name: "asc" },
  });

  // 3. Fetch Real Courts from Database
  const dbCourts = await prisma.court.findMany({
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });

  // Group courts dynamically by sport from database records
  const courtsBySport: Record<string, typeof dbCourts> = {};
  for (const c of dbCourts) {
    if (!courtsBySport[c.sport]) {
      courtsBySport[c.sport] = [];
    }
    courtsBySport[c.sport].push(c);
  }

  // 4. Build 7-day availability strip directly from DB bookings and courts
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
        freeSlotsCount: 0,
        featuredSlots: [],
      });
    }
  }

  const sportIcons: Record<string, typeof Trophy> = {
    TENNIS: Trophy,
    PADEL: Zap,
    BADMINTON: ShieldCheck,
  };

  const sportColorAccents: Record<string, string> = {
    TENNIS: "#5F9E4A",
    PADEL: "#E8883A",
    BADMINTON: "#5F9E4A",
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F5E1] text-[#1B1B1B]">
      {/* 1. HERO SECTION & NAV */}
      <HeroSection />

      {/* 2. THIS WEEK'S AVAILABILITY STRIP (ALL DB DRIVEN) */}
      <section id="availability" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#5F9E4A] block mb-1">
              LIVE BOOKING ENGINE
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold uppercase tracking-tight text-[#1B1B1B]">
              THIS WEEK&apos;S <span className="text-[#5F9E4A]">court</span> SCHEDULE
            </h2>
          </div>
          <p className="text-xs text-[#1B1B1B]/70 max-w-md">
            Real-time court availability across Tennis, Padel, and Badminton. Select any day or slot to lock in your match time.
          </p>
        </div>

        <WeekAvailabilityStrip days={weekDays} />
      </section>

      {/* 3. FACILITIES & COURTS (ALL DB DRIVEN) */}
      <section id="facilities" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#5F9E4A] block">
            DATABASE-MANAGED VENUES
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight text-[#1B1B1B]">
            THE <span className="text-[#5F9E4A]">championship</span> COURTS
          </h2>
          <p className="text-xs sm:text-sm text-[#1B1B1B]/75">
            Engineered to tournament standards. Live court inventory synced directly with the club database.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(courtsBySport).map(([sport, courts]) => {
            const Icon = sportIcons[sport] || Trophy;
            const accentColor = sportColorAccents[sport] || "#5F9E4A";

            return (
              <div
                key={sport}
                className="rounded-[28px] p-8 bg-white border border-[#1B1B1B]/20 shadow-sm space-y-5 hover:border-[#5F9E4A] transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-[#EDECCF] flex items-center justify-center text-[#5F9E4A]">
                      <Icon className="h-6 w-6" style={{ color: accentColor }} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#F6F5E1] text-[#1B1B1B] border border-[#1B1B1B]/15">
                      {courts.length} {courts.length === 1 ? "Court" : "Courts"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8883A] block">
                      Sport Category
                    </span>
                    <h3 className="text-2xl font-bold tracking-tight text-[#1B1B1B]">
                      {sport}
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-[#1B1B1B]/10">
                    <div className="text-xs font-bold text-[#1B1B1B]/70 uppercase tracking-wider">
                      Active Courts:
                    </div>
                    {courts.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-[#F6F5E1] border border-[#1B1B1B]/10"
                      >
                        <div className="font-semibold text-[#1B1B1B] truncate mr-2">
                          {c.name}
                        </div>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          Cap: {c.capacity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1B1B1B]/10">
                  <Link
                    href={`/member/book`}
                    className="w-full h-11 rounded-full border border-[#1B1B1B]/25 hover:border-[#1B1B1B] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#F6F5E1] transition-all"
                  >
                    <span>Reserve {sport}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. MEMBERSHIP PLANS (FROM DATABASE) */}
      <section id="plans" className="py-20 px-4 sm:px-6 bg-[#EDECCF]/40 border-t border-b border-[#1B1B1B]/15">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-widest text-[#5F9E4A] block">
              ANNUAL PRIVILEGES
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold uppercase tracking-tight text-[#1B1B1B]">
              MEMBERSHIP <span className="text-[#5F9E4A]">tiers</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#1B1B1B]/75">
              Select your privilege level. Enjoy tiered discounts across courts, pro shop gear, and the club cafeteria.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const isGold = plan.name.toUpperCase().includes("GOLD");
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-[28px] p-8 flex flex-col justify-between border bg-white ${
                    isGold
                      ? "border-[#5F9E4A] ring-2 ring-[#5F9E4A]/30 shadow-md"
                      : "border-[#1B1B1B]/20"
                  }`}
                >
                  {isGold && (
                    <div className="absolute -top-3.5 right-8 bg-[#E8883A] text-[#1B1B1B] text-[10px] font-black uppercase tracking-widest px-3.5 py-1 rounded-full shadow-sm">
                      RECOMMENDED
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-[#1B1B1B]">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline gap-1 mt-3">
                        <span className="text-5xl font-extrabold text-[#1B1B1B]">
                          ₹{Number(plan.price).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-gray-500">
                          / {plan.durationDays} days
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs text-[#1B1B1B]/80 pt-4 border-t border-[#1B1B1B]/15">
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-[#5F9E4A]" />
                        <span><strong>{Number(plan.courtDiscountPct)}% OFF</strong> court reservations</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-[#5F9E4A]" />
                        <span><strong>{Number(plan.shopDiscountPct)}% OFF</strong> Pro Shop merchandise</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-[#5F9E4A]" />
                        <span><strong>{Number(plan.barDiscountPct)}% OFF</strong> Champions Bar & Lounge</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="h-4 w-4 text-[#5F9E4A]" />
                        <span>Daily Booking Quota: <strong>{isGold ? "4 slots/day" : "2 slots/day"}</strong></span>
                      </div>
                    </div>
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
        </div>
      </section>

      {/* 5. PRO SHOP PREVIEW (FROM DATABASE) */}
      <section id="shop" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#5F9E4A] block mb-1">
              PRO-GRADE EQUIPMENT
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold uppercase tracking-tight text-[#1B1B1B]">
              CHAMPIONS <span className="text-[#5F9E4A]">pro</span> SHOP
            </h2>
          </div>
          <Link
            href="/member/shop"
            className="text-xs font-bold text-[#5F9E4A] hover:underline flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>Visit Full Pro Shop</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl p-4 bg-white border border-[#1B1B1B]/15 hover:border-[#5F9E4A] transition-all flex flex-col justify-between shadow-2xs"
            >
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8883A]">
                  {p.category}
                </span>
                <h4 className="text-xs font-bold text-[#1B1B1B] line-clamp-2">{p.name}</h4>
              </div>
              <div className="mt-4 pt-3 border-t border-[#1B1B1B]/15 flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#1B1B1B]">
                  ₹{Number(p.price).toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] text-[#5F9E4A] font-semibold">
                  {p.stockQty > 0 ? "In Stock" : "Backorder"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. VISIT THE CLUB & INQUIRIES SECTION */}
      <section id="contact" className="py-20 px-4 sm:px-6 bg-[#EDECCF]/30 border-t border-[#1B1B1B]/15">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Club Info & Pitch */}
          <div className="space-y-6">
            <span className="text-xs font-bold uppercase tracking-widest text-[#5F9E4A] block">
              VISIT THE CLUB
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold uppercase tracking-tight text-[#1B1B1B]">
              EXPERIENCE <span className="text-[#5F9E4A]">championship</span> CALIBER
            </h2>
            <p className="text-xs sm:text-sm text-[#1B1B1B]/75 leading-relaxed max-w-lg">
              Visit The Champions Club in the heart of Indiranagar. Experience our world-class courts, Pro Shop, and members lounge, or contact our concierge for corporate and private bookings.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 text-xs text-[#1B1B1B]/80">
                <MapPin className="h-5 w-5 text-[#5F9E4A] shrink-0" />
                <span>124 Club Crescent, Indiranagar, Bengaluru, KA 560038</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#1B1B1B]/80">
                <Clock className="h-5 w-5 text-[#5F9E4A] shrink-0" />
                <span>Open 7 Days a Week: 06:00 AM – 10:00 PM</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#1B1B1B]/80">
                <Phone className="h-5 w-5 text-[#5F9E4A] shrink-0" />
                <span>+91 80 4910 8800 • Concierge & Inquiries</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#1B1B1B]/80">
                <Mail className="h-5 w-5 text-[#5F9E4A] shrink-0" />
                <span>concierge@thechampionsclub.in</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-8 h-12 rounded-full font-bold text-xs uppercase tracking-wider bg-[#1B1B1B] hover:bg-black text-[#F6F5E1] transition-all shadow-md"
              >
                <span>Apply for Club Membership</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Contact & Inquiries Card */}
          <div className="rounded-[28px] p-8 bg-white border border-[#1B1B1B]/20 shadow-sm space-y-4">
            <h3 className="text-2xl font-bold tracking-tight text-[#1B1B1B]">
              CLUB CONCIERGE & INQUIRIES
            </h3>
            <p className="text-xs text-gray-600">
              Interested in corporate tournament bookings, junior academy coaching, or private events? Send us a quick note.
            </p>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-12 px-4 sm:px-6 bg-[#F6F5E1] border-t border-[#1B1B1B]/15 text-xs text-[#1B1B1B]/70">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full border border-[#1B1B1B]/20 flex items-center justify-center font-bold text-lg select-none bg-white shadow-2xs">
              <span className="text-[#E8883A]">c</span>
              <span className="text-[#5F9E4A]">.</span>
            </div>
            <div>
              <span className="font-bold uppercase text-base tracking-wider text-[#1B1B1B] block leading-none">
                THE CHAMPIONS CLUB
              </span>
              <span className="text-[10px] text-[#5F9E4A] font-semibold tracking-widest uppercase">
                EST. 2026 • BENGALURU
              </span>
            </div>
          </div>

          <div className="text-center sm:text-right space-y-0.5 text-[11px] text-gray-500">
            <div>Operating Daily: 06:00 AM – 10:00 PM (IST)</div>
            <div>© 2026 The Champions Club. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
