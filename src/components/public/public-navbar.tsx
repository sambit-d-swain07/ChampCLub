"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Menu, X, ArrowRight } from "lucide-react";

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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07271D]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="h-10 w-10 rounded-full bg-[#C8F13A] text-[#07271D] flex items-center justify-center font-bold shadow-md transition-transform group-hover:scale-105">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <span className="font-display uppercase text-2xl tracking-wider text-[#F4F1EA] block leading-none">
              THE CHAMPIONS CLUB
            </span>
            <span className="text-[10px] tracking-widest text-[#C8F13A] uppercase font-semibold">
              BENGALURU • PREMIER RACQUET SPORTS
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-[#F4F1EA]/80">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-[#C8F13A] transition-colors py-2"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider text-[#F4F1EA] hover:text-[#C8F13A] border border-white/20 hover:border-[#C8F13A] transition-all"
          >
            Member Login
          </Link>
          <Link
            href="/trial"
            className="px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all shadow-md flex items-center gap-1.5"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-[#F4F1EA] hover:text-[#C8F13A] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#07271D] px-6 py-6 space-y-4">
          <nav className="flex flex-col space-y-3 text-sm font-bold uppercase tracking-wider text-[#F4F1EA]/80">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#C8F13A] py-1"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-full text-xs font-bold uppercase tracking-wider text-[#F4F1EA] border border-white/20"
            >
              Member Login
            </Link>
            <Link
              href="/trial"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-[#C8F13A] text-[#07271D]"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
