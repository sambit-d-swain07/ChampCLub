import Link from "next/link";
import { PublicNavbar } from "@/components/public/public-navbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F5E1] text-[#1B1B1B]">
      {/* Responsive Navbar */}
      <PublicNavbar />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#1B1B1B]/15 bg-[#F6F5E1] py-12 px-6 text-[#1B1B1B]/70">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8 text-xs">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-full border border-[#1B1B1B]/20 flex items-center justify-center font-bold text-sm bg-white">
                <span className="text-[#E8883A]">c</span>
                <span className="text-[#5F9E4A]">.</span>
              </div>
              <span className="font-bold text-[#1B1B1B] text-sm tracking-wide">The Champions Club</span>
            </div>
            <p className="text-[#1B1B1B]/70 text-xs leading-relaxed">
              Premium racquet sports club offering world-class facilities for Tennis, Padel,
              and Badminton in Bengaluru.
            </p>
          </div>
          <div>
            <div className="text-[#1B1B1B] font-bold text-xs uppercase tracking-wider mb-3">Quick Links</div>
            <div className="flex flex-col gap-2">
              {[
                ["Facilities", "/facilities"],
                ["Membership Plans", "/plans"],
                ["Apply for Membership", "/signup"],
                ["Contact Us", "/contact"],
                ["Sign In", "/login"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="text-xs text-[#1B1B1B]/70 hover:text-[#1B1B1B] transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[#1B1B1B] font-bold text-xs uppercase tracking-wider mb-3">Get in Touch</div>
            <div className="text-[#1B1B1B]/70 text-xs space-y-1.5">
              <div>124 Club Crescent, Indiranagar</div>
              <div>Bengaluru, Karnataka 560038</div>
              <div className="pt-2 text-[#5F9E4A] font-medium">+91 80 4910 8800</div>
              <div>concierge@thechampionsclub.in</div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#1B1B1B]/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#1B1B1B]/50 gap-2">
          <span>Operating Daily: 06:00 AM – 10:00 PM (IST)</span>
          <span>© 2026 The Champions Club. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
