"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Courts & Facilities", href: "/#facilities" },
    { label: "Availability", href: "/#availability" },
    { label: "Memberships", href: "/#plans" },
    { label: "Pro Shop", href: "/#shop" },
    { label: "Contact", href: "/#contact" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#1B1B1B]/15 bg-[#F6F5E1]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-full border border-[#1B1B1B]/20 flex items-center justify-center font-bold text-lg select-none bg-white shadow-2xs group-hover:scale-105 transition-transform">
            <span className="text-[#E8883A]">c</span>
            <span className="text-[#5F9E4A]">.</span>
          </div>
          <div>
            <span className="font-bold uppercase text-base tracking-wider text-[#1B1B1B] block leading-none">
              THE CHAMPIONS CLUB
            </span>
            <span className="text-[9px] tracking-widest text-[#5F9E4A] uppercase font-semibold">
              BENGALURU • PREMIER RACQUET SPORTS
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-2 text-xs font-medium text-[#1B1B1B]">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="h-8 px-3.5 rounded-full border border-[#1B1B1B]/25 hover:border-[#1B1B1B] hover:bg-white/60 transition-all flex items-center justify-center"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Buttons: Sign in (outlined pill) & Sign up (filled orange pill) */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link
            href="/login"
            className="h-9 px-4 rounded-full text-xs font-medium text-[#1B1B1B] hover:border-[#1B1B1B] border border-[#1B1B1B]/30 hover:bg-white/50 transition-all flex items-center justify-center"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="h-9 px-5 rounded-full text-xs font-semibold bg-[#E8883A] text-[#1B1B1B] hover:bg-[#db7a2e] transition-all shadow-xs flex items-center justify-center"
          >
            Sign up
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-[#1B1B1B] hover:bg-black/5 transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#1B1B1B]/15 bg-[#F6F5E1] px-6 py-6 space-y-4">
          <nav className="flex flex-col space-y-2 text-sm font-medium text-[#1B1B1B]">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-xl hover:bg-black/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-[#1B1B1B]/15 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-full text-xs font-medium text-[#1B1B1B] border border-[#1B1B1B]/30 bg-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-full text-xs font-semibold bg-[#E8883A] text-[#1B1B1B] shadow-xs"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
