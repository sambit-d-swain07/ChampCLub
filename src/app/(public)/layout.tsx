import Link from "next/link";
import { Trophy } from "lucide-react";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F0F4EF" }}>
      {/* Sticky nav */}
      <header
        className="sticky top-0 z-30 border-b border-[#2D6A4F]/20"
        style={{ background: "#0F2A1F" }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center"
              style={{ background: "#2D6A4F" }}
            >
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-white leading-none">
                THE CHAMPIONS CLUB
              </div>
              <div className="text-[10px] text-[#74C69D] font-medium mt-0.5">
                Racquet &amp; Sports
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/"
              className="px-3 py-1.5 rounded text-[#74C69D] hover:text-white hover:bg-[#1A3D2B] transition-colors"
            >
              Home
            </Link>
            <Link
              href="/facilities"
              className="px-3 py-1.5 rounded text-[#74C69D] hover:text-white hover:bg-[#1A3D2B] transition-colors"
            >
              Facilities
            </Link>
            <Link
              href="/plans"
              className="px-3 py-1.5 rounded text-[#74C69D] hover:text-white hover:bg-[#1A3D2B] transition-colors"
            >
              Plans
            </Link>
            <Link
              href="/contact"
              className="px-3 py-1.5 rounded text-[#74C69D] hover:text-white hover:bg-[#1A3D2B] transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/trial"
              className="ml-3 px-4 py-2 rounded-lg font-semibold text-[#0F2A1F] text-sm transition-colors"
              style={{ background: "#74C69D" }}
            >
              Book Free Trial
            </Link>
          </nav>

          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/trial"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0F2A1F]"
              style={{ background: "#74C69D" }}
            >
              Book Trial
            </Link>
          </div>
        </div>
      </header>

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
                <div>12 Club Road, Bandra West</div>
                <div>Mumbai, Maharashtra 400050</div>
                <div>+91 22 4000 7000</div>
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
