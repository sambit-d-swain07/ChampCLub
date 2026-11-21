import Link from "next/link";
import { Trophy } from "lucide-react";
import { PublicNavbar } from "@/components/public/public-navbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4EF" }}>
      {/* Responsive Navbar */}
      <PublicNavbar />

      <main className="flex-1">{children}</main>

      <footer style={{ background: "#0F2A1F" }} className="border-t border-[#2D6A4F]/30">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-5 w-5 text-[#74C69D]" />
                <span className="font-bold text-white text-sm">The Champions Club</span>
              </div>
              <p className="text-[#74C69D] text-xs leading-relaxed">
                Premium racquet sports club offering world-class facilities for Tennis, Padel,
                and Badminton.
              </p>
            </div>
            <div>
              <div className="text-white font-semibold text-xs mb-3">Quick Links</div>
              <div className="flex flex-col gap-1.5">
                {[
                  ["Facilities", "/facilities"],
                  ["Membership Plans", "/plans"],
                  ["Book a Trial", "/trial"],
                  ["Contact Us", "/contact"],
                  ["Sign In", "/login"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-xs text-[#74C69D] hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div className="text-white font-semibold text-xs mb-3">Get in Touch</div>
              <div className="text-[#74C69D] text-xs space-y-1.5">
                <div>24 Racquet Road, Indiranagar</div>
                <div>Bengaluru, Karnataka 560038</div>
                <div>+91 80 4567 8900</div>
                <div>hello@championsclub.in</div>
              </div>
            </div>
          </div>
          <div className="border-t border-[#2D6A4F]/30 mt-8 pt-6 text-center text-[#2D6A4F] text-xs">
            © 2026 The Champions Club. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
