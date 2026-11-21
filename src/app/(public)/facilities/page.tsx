import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Check, ArrowRight, Zap, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Facilities | The Champions Club",
  description:
    "World-class Tennis, Padel, and Badminton courts plus a sports bar, pro shop, and premium amenities at The Champions Club.",
};

const courts = [
  {
    sport: "Tennis",
    accent: "#5F9E4A",
    icon: Trophy,
    headline: "Championship Tennis",
    courts: "2 tournament-grade cushioned acrylic courts",
    details: [
      "Full LED broadcast-grade 1000-lux floodlights",
      "Ball machine stations (bookable separately)",
      "Professional coaching on request",
      "Capacity: 4 players per court",
      "Dynamic peak / off-peak pricing",
    ],
  },
  {
    sport: "Padel",
    accent: "#E8883A",
    icon: Zap,
    headline: "Panoramic Padel",
    courts: "2 panoramic glass & turf padel arenas",
    details: [
      "Full 12mm tempered safety glass walls",
      "Texturized Mondo supercourt turf",
      "Social play Friday sessions",
      "Racket rentals from Pro Shop",
      "Capacity: 4 players per court",
    ],
  },
  {
    sport: "Badminton",
    accent: "#5F9E4A",
    icon: ShieldCheck,
    headline: "Elite Badminton",
    courts: "2 shock-absorbing courts (teakwood + synthetic)",
    details: [
      "BWF-standard anti-glare illumination",
      "Yonex tournament shuttles in-stock",
      "Junior Academy sessions (age 8–17)",
      "9-meter vertical ceiling clearance",
      "Capacity: 4 players per court",
    ],
  },
];

const amenities = [
  {
    name: "Champions Bar & Café",
    desc: "Post-match recovery fuel: craft juices, protein shakes, artisanal coffee, and a full sports bar menu. Members enjoy F&B discounts based on their plan tier.",
  },
  {
    name: "Pro Shop",
    desc: "On-site pro shop stocked with rackets, strings, grips, shoes, and apparel from leading brands. Stringing service available same-day.",
  },
  {
    name: "Locker Rooms",
    desc: "Spacious, climate-controlled locker rooms with showers, towel service, and secure digital lockers.",
  },
  {
    name: "Coaching & Academy",
    desc: "On-staff AITA/WPF-certified coaches available for private lessons, group clinics, and junior development programs.",
  },
];

export default function FacilitiesPage() {
  return (
    <div className="bg-[#F6F5E1] text-[#1B1B1B]">
      {/* Hero */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white border border-[#1B1B1B]/15 text-xs font-semibold text-[#5F9E4A] shadow-2xs">
          WORLD-CLASS RACQUET SPORTS
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#1B1B1B] leading-tight">
          World-Class Courts.
          <br />
          <span className="text-[#5F9E4A]">Zero Compromises.</span>
        </h1>
        <p className="text-[#1B1B1B]/75 text-base max-w-xl mx-auto leading-relaxed">
          Six tournament-grade courts across three disciplines, plus everything you need before and after
          your match.
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

      {/* Courts */}
      <section className="py-16 px-6 max-w-6xl mx-auto space-y-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1B1B1B]">Our Championship Courts</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {courts.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.sport}
                className="rounded-[28px] overflow-hidden border border-[#1B1B1B]/15 bg-white p-7 shadow-sm hover:border-[#5F9E4A] transition-all space-y-4"
              >
                <div className="h-11 w-11 rounded-2xl bg-[#EDECCF] flex items-center justify-center text-[#5F9E4A]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#E8883A] mb-1">
                    {c.sport}
                  </div>
                  <h3 className="text-xl font-bold text-[#1B1B1B] mb-1">{c.headline}</h3>
                  <p className="text-xs text-gray-500">{c.courts}</p>
                </div>
                <ul className="space-y-2 pt-2 border-t border-[#1B1B1B]/10">
                  {c.details.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-xs text-[#1B1B1B]/80">
                      <Check className="h-4 w-4 text-[#5F9E4A] shrink-0 mt-0.5" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
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
            {amenities.map((a) => (
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
