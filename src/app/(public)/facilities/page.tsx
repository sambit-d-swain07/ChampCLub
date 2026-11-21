import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Trophy, Check, ArrowRight, Zap, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Facilities | The Champions Club",
  description:
    "World-class Tennis, Padel, and Badminton courts plus a sports bar, pro shop, and premium amenities at The Champions Club.",
};

export const dynamic = "force-dynamic";

export default async function FacilitiesPage() {
  // Query all real courts from the database
  const dbCourts = await prisma.court.findMany({
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });

  // Query base pricing rules for sports from DB
  const pricingRules = await prisma.pricingRule.findMany({
    where: { planId: null },
  });

  const priceBySport: Record<string, number> = {};
  for (const pr of pricingRules) {
    priceBySport[pr.sport] = Number(pr.basePrice);
  }

  // Group courts dynamically by sport
  const courtsBySport: Record<string, typeof dbCourts> = {};
  for (const c of dbCourts) {
    if (!courtsBySport[c.sport]) {
      courtsBySport[c.sport] = [];
    }
    courtsBySport[c.sport].push(c);
  }

  const sportIcons: Record<string, typeof Trophy> = {
    TENNIS: Trophy,
    PADEL: Zap,
    BADMINTON: ShieldCheck,
  };

  const sportDescriptions: Record<string, string> = {
    TENNIS: "Championship acrylic cushioned hardcourts with tournament LED illumination.",
    PADEL: "Panoramic glass arenas with texturized synthetic turf for high-intensity play.",
    BADMINTON: "BWF-standard shock-absorbing teakwood & synthetic competition courts.",
  };

  const clubAmenities = [
    {
      name: "Champions Bar & Café",
      desc: "Fresh juices, protein recovery shakes, espresso bar, and sports lounge menu. Member discounts apply automatically.",
    },
    {
      name: "Pro Shop",
      desc: "Fully stocked pro store with demo rackets, strings, balls, grips, and technical sportswear.",
    },
    {
      name: "Locker Rooms & Recovery",
      desc: "Climate-controlled shower suites, lockers, and pre-match warm-up zone.",
    },
    {
      name: "Coaching & Clinics",
      desc: "Certified coaching staff available for private drills, group clinics, and junior development.",
    },
  ];

  return (
    <div className="bg-[#F6F5E1] text-[#1B1B1B]">
      {/* Hero */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white border border-[#1B1B1B]/15 text-xs font-semibold text-[#5F9E4A] shadow-2xs">
          DATABASE-SYNCED VENUES
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#1B1B1B] leading-tight">
          World-Class Courts.
          <br />
          <span className="text-[#5F9E4A]">Zero Compromises.</span>
        </h1>
        <p className="text-[#1B1B1B]/75 text-base max-w-xl mx-auto leading-relaxed">
          {dbCourts.length} active tournament-grade courts managed in real time across Tennis, Padel, and Badminton.
        </p>
        <div className="pt-2">
          <Link
            href="/login?redirect=/member/book"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-[#F6F5E1] text-sm bg-[#1B1B1B] hover:bg-black transition-all shadow-md"
          >
            <span>Book a Court</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Courts (Grouped from Database) */}
      <section className="py-16 px-6 max-w-6xl mx-auto space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#5F9E4A]">
              COURT INVENTORY
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1B1B1B]">
              Active Club Courts
            </h2>
          </div>
          <span className="text-xs font-mono text-gray-500">
            {dbCourts.length} Total Courts in Database
          </span>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {Object.entries(courtsBySport).map(([sport, courts]) => {
            const Icon = sportIcons[sport] || Trophy;
            const baseRate = priceBySport[sport];

            return (
              <div
                key={sport}
                className="rounded-[28px] overflow-hidden border border-[#1B1B1B]/15 bg-white p-7 shadow-sm hover:border-[#5F9E4A] transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-11 w-11 rounded-2xl bg-[#EDECCF] flex items-center justify-center text-[#5F9E4A]">
                      <Icon className="h-5 w-5" />
                    </div>
                    {baseRate && (
                      <span className="text-xs font-bold text-[#1B1B1B] bg-[#F6F5E1] px-2.5 py-1 rounded-full border border-[#1B1B1B]/10">
                        From ₹{baseRate}/hr
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#E8883A] mb-1">
                      {sport}
                    </div>
                    <h3 className="text-xl font-bold text-[#1B1B1B]">
                      {courts.length} {sport} {courts.length === 1 ? "Court" : "Courts"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {sportDescriptions[sport] || "Championship standard sporting venue."}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-[#1B1B1B]/10">
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Individual Courts:
                    </div>
                    {courts.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#F6F5E1] border border-[#1B1B1B]/10"
                      >
                        <span className="font-semibold text-[#1B1B1B]">{c.name}</span>
                        <span className="text-[10px] text-gray-500">Max: {c.capacity}p</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1B1B1B]/10">
                  <Link
                    href={`/login?redirect=/member/book`}
                    className="w-full h-10 rounded-full border border-[#1B1B1B]/25 hover:border-[#1B1B1B] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#F6F5E1] transition-all"
                  >
                    <span>Check Availability</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Amenities */}
      <section className="py-16 px-6 bg-[#EDECCF]/35 border-t border-b border-[#1B1B1B]/10">
        <div className="max-w-6xl mx-auto space-y-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1B1B1B]">Club Amenities</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {clubAmenities.map((a) => (
              <div
                key={a.name}
                className="rounded-[24px] p-6 border border-[#1B1B1B]/15 bg-white shadow-2xs"
              >
                <h3 className="font-bold text-[#1B1B1B] text-base mb-2">{a.name}</h3>
                <p className="text-xs text-[#1B1B1B]/75 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1B1B1B]">Ready to play?</h2>
        <p className="text-[#1B1B1B]/75 text-sm max-w-md mx-auto">
          Book championship courts or apply for club membership today.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            href="/login?redirect=/member/book"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-[#F6F5E1] text-sm bg-[#1B1B1B] hover:bg-black shadow-md transition-all"
          >
            <span>Book a Court</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-medium text-[#1B1B1B] text-sm border border-[#1B1B1B]/30 hover:border-[#1B1B1B] bg-white transition-all"
          >
            Sign up
          </Link>
        </div>
      </section>
    </div>
  );
}
