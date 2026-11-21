import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Facilities | The Champions Club",
  description:
    "World-class Tennis, Padel, and Badminton courts plus a sports bar, pro shop, and premium amenities at The Champions Club.",
};

const courts = [
  {
    sport: "Tennis",
    color: "#1A3D2B",
    accent: "#74C69D",
    headline: "Championship Tennis",
    courts: "2 tournament-grade cushioned acrylic courts",
    details: [
      "Full LED broadcast-grade floodlights",
      "Ball machine stations (bookable separately)",
      "Professional coaching on request",
      "Capacity: 4 players per court",
      "Dynamic peak / off-peak pricing",
    ],
  },
  {
    sport: "Padel",
    color: "#0F2A1F",
    accent: "#74C69D",
    headline: "Pro Padel Arenas",
    courts: "2 panoramic glass & turf padel arenas",
    details: [
      "Full-glass side and back walls",
      "Video replay system at each arena",
      "Social play Friday sessions",
      "Racket rentals from Pro Shop",
      "Capacity: 4 players per court",
    ],
  },
  {
    sport: "Badminton",
    color: "#1A3D2B",
    accent: "#74C69D",
    headline: "Elite Badminton",
    courts: "2 shock-absorbing courts (teakwood + synthetic)",
    details: [
      "BWF-standard anti-glare illumination",
      "Yonex tournament shuttles in-stock",
      "Junior Academy sessions (age 8–17)",
      "Dedicated shoe-change area",
      "Capacity: 4 players per court",
    ],
  },
];

const amenities = [
  {
    name: "Champions Bar & Café",
    desc: "Post-match recovery fuel: craft juices, protein shakes, coffee, and a full sports bar menu. Members enjoy F&B discounts based on their plan tier.",
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
    <div>
      {/* Hero */}
      <section
        className="py-20 px-6 text-center"
        style={{ background: "linear-gradient(135deg, #0F2A1F 0%, #1A3D2B 100%)" }}
      >
        <h1
          className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          World-Class Courts.
          <br />
          <span style={{ color: "#74C69D" }}>Zero Compromises.</span>
        </h1>
        <p className="mt-5 text-[#74C69D] text-base max-w-xl mx-auto leading-relaxed">
          Six premium courts across three disciplines, plus everything you need before and after
          your session.
        </p>
        <Link
          href="/trial"
          className="mt-8 inline-block px-8 py-3 rounded-lg font-bold text-[#0F2A1F] text-sm transition-opacity hover:opacity-90"
          style={{ background: "#74C69D" }}
        >
          Book your free trial
        </Link>
      </section>

      {/* Courts */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-[#0F2A1F] mb-10">Our Courts</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {courts.map((c) => (
            <div
              key={c.sport}
              className="rounded-xl overflow-hidden border border-[#2D6A4F]/20"
              style={{ background: "#fff" }}
            >
              <div className="h-3" style={{ background: c.color }} />
              <div className="p-6">
                <div
                  className="text-xs font-semibold mb-1"
                  style={{ color: "#2D6A4F" }}
                >
                  {c.sport}
                </div>
                <h3 className="text-lg font-bold text-[#0F2A1F] mb-1">{c.headline}</h3>
                <p className="text-xs text-gray-500 mb-4">{c.courts}</p>
                <ul className="space-y-1.5">
                  {c.details.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-xs text-gray-700">
                      <span
                        className="mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
                        style={{ background: "#74C69D" }}
                      />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Amenities */}
      <section className="py-14 px-6" style={{ background: "#F0F4EF" }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-[#0F2A1F] mb-8">Club Amenities</h2>
          <div className="grid gap-5 md:grid-cols-2">
            {amenities.map((a) => (
              <div
                key={a.name}
                className="rounded-xl p-6 border border-[#2D6A4F]/15"
                style={{ background: "#fff" }}
              >
                <h3 className="font-bold text-[#0F2A1F] text-sm mb-2">{a.name}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 px-6 text-center"
        style={{ background: "#1A3D2B" }}
      >
        <h2 className="text-2xl font-bold text-white mb-3">Ready to play?</h2>
        <p className="text-[#74C69D] text-sm mb-6">
          Try any court for free — no membership required.
        </p>
        <Link
          href="/trial"
          className="inline-block px-8 py-3 rounded-lg font-bold text-[#0F2A1F] text-sm"
          style={{ background: "#74C69D" }}
        >
          Book your free trial
        </Link>
      </section>
    </div>
  );
}
