import { MapPin, Phone, Mail, Clock } from "lucide-react";

export const CLUB_SETTINGS = {
  name: "The Champions Club",
  address: "124 Club Crescent, Indiranagar, Bengaluru, KA 560038",
  phone: "+91 80 4910 8800",
  email: "concierge@thechampionsclub.in",
  openingHours: "Monday – Sunday: 06:00 AM – 10:00 PM",
  hoursBreakdown: [
    { label: "Courts & Facilities", time: "06:00 AM – 10:00 PM" },
    { label: "Pro Shop", time: "07:00 AM – 09:00 PM" },
    { label: "Champions Bar & Lounge", time: "07:00 AM – 10:00 PM" },
    { label: "Front Desk & Concierge", time: "06:00 AM – 10:00 PM" },
  ],
};

export function ContactForm() {
  return (
    <div className="space-y-5 pt-2 text-[#1B1B1B]">
      <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-[#F6F5E1]/60 border border-[#1B1B1B]/10">
        <MapPin className="h-5 w-5 text-[#5F9E4A] shrink-0 mt-0.5" />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B1B1B]/60">Club Location</div>
          <div className="text-xs font-semibold leading-relaxed mt-0.5">{CLUB_SETTINGS.address}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F6F5E1]/60 border border-[#1B1B1B]/10">
          <Phone className="h-4 w-4 text-[#5F9E4A] shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B1B1B]/60">Telephone</div>
            <a
              href={`tel:${CLUB_SETTINGS.phone.replace(/[^+\d]/g, "")}`}
              className="text-xs font-semibold hover:text-[#5F9E4A] transition-colors mt-0.5 block"
            >
              {CLUB_SETTINGS.phone}
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F6F5E1]/60 border border-[#1B1B1B]/10">
          <Mail className="h-4 w-4 text-[#5F9E4A] shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B1B1B]/60">Email</div>
            <a
              href={`mailto:${CLUB_SETTINGS.email}`}
              className="text-xs font-semibold hover:text-[#5F9E4A] transition-colors mt-0.5 block truncate max-w-[160px]"
            >
              {CLUB_SETTINGS.email}
            </a>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-[#F6F5E1]/60 border border-[#1B1B1B]/10 space-y-2.5">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#1B1B1B]/60">
          <Clock className="h-3.5 w-3.5 text-[#5F9E4A]" /> Operating Hours
        </div>
        <div className="space-y-1.5 text-xs divide-y divide-[#1B1B1B]/10">
          {CLUB_SETTINGS.hoursBreakdown.map((item) => (
            <div key={item.label} className="flex items-center justify-between pt-1.5 first:pt-0">
              <span className="text-gray-600 font-medium">{item.label}</span>
              <span className="font-bold text-[#1B1B1B]">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
