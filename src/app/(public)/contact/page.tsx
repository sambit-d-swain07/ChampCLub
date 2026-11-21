import type { Metadata } from "next";
import { MapPin, Clock, Phone, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | The Champions Club",
  description:
    "Get in touch with The Champions Club in Bengaluru. Address, phone, email, and opening hours.",
};

const hours = [
  { day: "Monday – Saturday", time: "6:00 AM – 10:00 PM" },
  { day: "Sunday", time: "6:00 AM – 09:00 PM" },
  { day: "Public Holidays", time: "7:00 AM – 08:00 PM" },
];

export default function ContactPage() {
  return (
    <div className="bg-[#F6F5E1] text-[#1B1B1B]">
      {/* Hero */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-white border border-[#1B1B1B]/15 text-xs font-semibold text-[#5F9E4A] shadow-2xs">
          CLUB CONCIERGE & BOOKINGS
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#1B1B1B] tracking-tight">
          Find Us on the Court
        </h1>
        <p className="text-[#1B1B1B]/75 text-base max-w-md mx-auto">
          Drop by, call, or email — we&apos;re always delighted to give you a tour.
        </p>
      </section>

      <section className="py-8 pb-20 px-6 max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-start">
        {/* Contact info */}
        <div className="space-y-6 bg-white rounded-[28px] p-8 border border-[#1B1B1B]/15 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5F9E4A]">
              <MapPin className="h-4 w-4" /> Address
            </div>
            <p className="text-sm text-[#1B1B1B]/85 leading-relaxed">
              124 Club Crescent, Indiranagar
              <br />
              Bengaluru, Karnataka 560038
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-[#1B1B1B]/10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5F9E4A]">
              <Phone className="h-4 w-4" /> Phone
            </div>
            <a
              href="tel:+918049108800"
              className="text-sm text-[#1B1B1B] font-semibold hover:text-[#5F9E4A] transition-colors"
            >
              +91 80 4910 8800
            </a>
          </div>

          <div className="space-y-2 pt-4 border-t border-[#1B1B1B]/10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5F9E4A]">
              <Mail className="h-4 w-4" /> Email
            </div>
            <a
              href="mailto:concierge@thechampionsclub.in"
              className="text-sm text-[#1B1B1B] font-semibold hover:text-[#5F9E4A] transition-colors"
            >
              concierge@thechampionsclub.in
            </a>
          </div>

          <div className="space-y-2 pt-4 border-t border-[#1B1B1B]/10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5F9E4A]">
              <Clock className="h-4 w-4" /> Operating Hours
            </div>
            <div className="space-y-1.5 text-xs text-[#1B1B1B]/80">
              {hours.map((h) => (
                <div key={h.day} className="flex justify-between">
                  <span className="text-gray-500">{h.day}</span>
                  <span className="font-semibold">{h.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Club Details */}
        <div className="bg-white rounded-[28px] p-8 border border-[#1B1B1B]/15 shadow-sm space-y-4">
          <h3 className="text-xl font-bold tracking-tight text-[#1B1B1B]">
            Concierge & Operating Schedule
          </h3>
          <p className="text-xs text-gray-500">
            For court reservations, equipment fitting, or dining inquiries, reach our dedicated front desk team.
          </p>
          <p className="text-xs text-gray-500 pt-2 border-t border-[#1B1B1B]/10">Walk-ins are welcome during operating hours. Members may book courts from their portal at any time.</p>
        </div>
      </section>
    </div>
  );
}
