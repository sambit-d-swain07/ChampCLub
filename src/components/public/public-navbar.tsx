"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Menu, X } from "lucide-react";

export function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Facilities", href: "/facilities" },
    { label: "Plans", href: "/plans" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header
      className="sticky top-0 z-30 border-b border-[#2D6A4F]/20"
      style={{ background: "rgba(15, 42, 31, 0.96)", backdropFilter: "blur(12px)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
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

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded text-[#74C69D] hover:text-white hover:bg-[#1A3D2B] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/trial"
            className="ml-3 px-4 py-2 rounded-lg font-semibold text-[#0F2A1F] text-sm transition-opacity hover:opacity-95"
            style={{ background: "#74C69D" }}
          >
            Book Free Trial
          </Link>
          <Link
            href="/login"
            className="ml-2 px-3 py-2 rounded-lg font-medium text-xs text-[#F0F4EF]/70 hover:text-white border border-[#74C69D]/20 transition-colors"
          >
            Sign In
          </Link>
        </nav>

        {/* Mobile Hamburger & Quick CTA */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/trial"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0F2A1F]"
            style={{ background: "#74C69D" }}
          >
            Book Trial
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-md text-[#74C69D] hover:text-white hover:bg-[#1A3D2B] transition-colors focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-t border-[#2D6A4F]/30 px-6 py-4 space-y-3"
          style={{ background: "#0F2A1F" }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-medium text-[#74C69D] hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#2D6A4F]/20 flex flex-col gap-2">
            <Link
              href="/trial"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-lg font-semibold text-xs text-[#0F2A1F]"
              style={{ background: "#74C69D" }}
            >
              Book a Free Trial Session
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-lg font-medium text-xs text-white border border-[#74C69D]/30"
            >
              Member &amp; Staff Login
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
