import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | The Champions Club",
  description:
    "Get in touch with The Champions Club. Address, phone, email, and opening hours.",
};

const hours = [
  { day: "Monday – Friday", time: "6:00 AM – 10:00 PM" },
  { day: "Saturday", time: "6:00 AM – 10:00 PM" },
  { day: "Sunday", time: "7:00 AM – 8:00 PM" },
  { day: "Public Holidays", time: "8:00 AM – 6:00 PM" },
];

export default function ContactPage() {
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
          Find Us on the Court
        </h1>
        <p className="mt-4 text-[#74C69D] text-sm max-w-md mx-auto">
          Drop by, call, or email — we&apos;re always happy to give you a tour.
        </p>
      </section>

      <section className="py-16 px-6 max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
        {/* Contact info */}
        <div className="space-y-8">
          <div>
            <div className="text-xs font-semibold text-[#2D6A4F] mb-2">Address</div>
            <p className="text-sm text-gray-800 leading-relaxed">
              12 Club Road, Bandra West
              <br />
              Mumbai, Maharashtra 400050
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#2D6A4F] mb-2">Phone</div>
            <a
              href="tel:+912240007000"
              className="text-sm text-[#1A3D2B] font-semibold hover:underline"
            >
              +91 22 4000 7000
            </a>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#2D6A4F] mb-2">Email</div>
            <a
              href="mailto:hello@championsclub.in"
              className="text-sm text-[#1A3D2B] font-semibold hover:underline"
            >
              hello@championsclub.in
            </a>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#2D6A4F] mb-3">Club Hours</div>
            <div className="rounded-xl overflow-hidden border border-[#2D6A4F]/20">
              {hours.map((h, i) => (
                <div
                  key={h.day}
                  className={`flex justify-between px-4 py-3 text-xs ${
                    i % 2 === 0 ? "bg-white" : "bg-[#F0F4EF]"
                  }`}
                >
                  <span className="text-gray-600">{h.day}</span>
                  <span className="font-semibold text-[#0F2A1F]">{h.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map placeholder */}
        <div>
          <div className="text-xs font-semibold text-[#2D6A4F] mb-3">Location</div>
          <div
            className="rounded-xl overflow-hidden border border-[#2D6A4F]/20 flex items-center justify-center"
            style={{ height: 320, background: "#1A3D2B" }}
          >
            <div className="text-center px-6">
              <div className="text-4xl mb-3">📍</div>
              <p className="text-[#74C69D] text-xs font-medium">
                12 Club Road, Bandra West
                <br />
                Mumbai, Maharashtra 400050
              </p>
              <a
                href="https://maps.google.com/?q=Bandra+West+Mumbai"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block px-5 py-2 rounded-lg text-xs font-bold text-[#0F2A1F]"
                style={{ background: "#74C69D" }}
              >
                Open in Google Maps
              </a>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Nearest metro: Bandra Station (W) · Valet parking available
          </p>
        </div>
      </section>
    </div>
  );
}
