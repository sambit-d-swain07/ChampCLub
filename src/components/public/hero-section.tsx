"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { CourtIllustration } from "@/components/public/court-illustration";

interface NavItem {
  id: string;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", href: "/" },
  { id: "facilities", label: "Courts", href: "/#facilities" },
  { id: "availability", label: "Availability", href: "/#availability" },
  { id: "plans", label: "Memberships", href: "/#plans" },
  { id: "shop", label: "Shop", href: "/#shop" },
  { id: "contact", label: "Contact", href: "/#contact" },
];

export function HeroSection() {
  const [activeSection, setActiveSection] = useState<string>("home");
  const [scrolledPastHero, setScrolledPastHero] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Monitor scroll for active section & sticky nav
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Show slim sticky bar when scrolled past hero (~640px)
      if (scrollY > 580) {
        setScrolledPastHero(true);
      } else {
        setScrolledPastHero(false);
      }

      // Check sections for active pill
      const sections = ["contact", "shop", "plans", "availability", "facilities"];
      let current = "home";

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 250) {
            current = sectionId;
            break;
          }
        }
      }

      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      {/* ========================================================
          SLIM STICKY NAV (Shows on scroll past hero)
         ======================================================== */}
      <div
        className={`fixed top-3 inset-x-0 mx-auto max-w-5xl z-50 px-4 transition-all duration-300 pointer-events-none ${
          scrolledPastHero
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4"
        }`}
      >
        <header className="h-12 px-3 sm:px-4 rounded-full bg-[#F6F5E1]/90 backdrop-blur-md border border-[#1B1B1B]/20 shadow-md flex items-center justify-between pointer-events-auto">
          {/* Logo mark: c. */}
          <Link
            href="/"
            className="flex items-center gap-1 font-bold text-lg select-none px-2 transition-transform hover:scale-105"
          >
            <span className="text-[#E8883A]">c</span>
            <span className="text-[#5F9E4A]">.</span>
          </Link>

          {/* Desktop Pills */}
          <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`h-8 px-3 rounded-full text-xs transition-all ${
                    isActive
                      ? "bg-[#1B1B1B] text-[#F6F5E1]"
                      : "text-[#1B1B1B]/80 hover:text-[#1B1B1B] hover:bg-[#1B1B1B]/5"
                  } flex items-center justify-center`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="h-8 px-3.5 rounded-full border border-[#1B1B1B]/30 hover:border-[#1B1B1B] text-[#1B1B1B] text-xs font-medium flex items-center justify-center transition-all hover:-translate-y-0.5"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="h-8 px-3.5 rounded-full bg-[#E8883A] hover:bg-[#d97c30] text-[#1B1B1B] text-xs font-semibold flex items-center justify-center transition-all hover:-translate-y-0.5 shadow-sm"
            >
              Sign up
            </Link>
          </div>
        </header>
      </div>

      {/* ========================================================
          FULL VIEWPORT HERO CONTAINER (Desktop & Mobile)
         ======================================================== */}
      <section className="p-3 sm:p-4 lg:p-4 w-full">
        <div className="w-full min-h-[calc(100vh-2rem)] lg:h-[calc(100vh-2rem)] rounded-[24px] sm:rounded-[28px] border border-[#1B1B1B]/20 bg-[#F6F5E1] p-4 sm:p-6 lg:p-7 flex flex-col justify-between overflow-hidden shadow-sm relative">
          
          {/* DESKTOP LAYOUT (Grid: 55% Left Column, 45% Right Column) */}
          <div className="w-full h-full flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 justify-between">
            
            {/* LEFT COLUMN (~55%) */}
            <div className="w-full lg:w-[55%] flex flex-col justify-between h-full pt-1 pb-2">
              
              {/* TOP-LEFT: Desktop Nav & Mobile Header */}
              <div>
                {/* Mobile Top Bar (< 768px) */}
                <div className="flex md:hidden items-center justify-between w-full mb-6 pb-3 border-b border-[#1B1B1B]/15">
                  <Link
                    href="/"
                    className="h-9 w-9 rounded-full border border-[#1B1B1B]/25 flex items-center justify-center font-bold text-lg select-none bg-[#F6F5E1] shadow-2xs"
                  >
                    <span className="text-[#E8883A]">c</span>
                    <span className="text-[#5F9E4A]">.</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link
                      href="/login"
                      className="h-9 px-3.5 rounded-full border border-[#1B1B1B]/30 text-xs font-medium text-[#1B1B1B] flex items-center justify-center"
                    >
                      Sign in
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen(true)}
                      className="h-9 px-3 rounded-full border border-[#1B1B1B]/30 hover:border-[#1B1B1B] text-[#1B1B1B] flex items-center justify-center text-xs font-medium gap-1.5 cursor-pointer bg-white/50"
                      aria-label="Open navigation menu"
                    >
                      <Menu className="h-4 w-4" />
                      <span>Menu</span>
                    </button>
                  </div>
                </div>

                {/* Desktop In-Hero Nav Row (>= 768px) */}
                <div className="hidden md:flex flex-wrap items-center justify-between gap-2.5">
                  {/* Left Pill Group: Home, Courts, Availability, Memberships, Shop, Contact */}
                  <nav className="flex flex-wrap items-center gap-2">
                    {NAV_ITEMS.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={`h-9 px-4 rounded-full text-sm font-medium transition-all duration-150 select-none flex items-center justify-center cursor-pointer ${
                            isActive
                              ? "bg-[#1B1B1B] text-[#F6F5E1] border border-[#1B1B1B] shadow-2xs"
                              : "border border-[#1B1B1B]/30 hover:border-[#1B1B1B] text-[#1B1B1B] hover:-translate-y-0.5 active:translate-y-0"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Right Far Actions: Sign in & Sign up */}
                  <div className="flex items-center gap-2 ml-auto">
                    <Link
                      href="/login"
                      className="h-9 px-4 rounded-full border border-[#1B1B1B]/30 hover:border-[#1B1B1B] text-[#1B1B1B] text-sm font-medium flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="h-9 px-5 rounded-full bg-[#E8883A] hover:bg-[#db7a2e] text-[#1B1B1B] font-semibold text-sm flex items-center justify-center transition-all hover:-translate-y-0.5 active:translate-y-0 shadow-xs"
                    >
                      Sign up
                    </Link>
                  </div>
                </div>
              </div>

              {/* MIDDLE-RIGHT: Short Original Tagline */}
              <div className="my-auto py-8 sm:py-12 flex justify-start md:justify-end">
                <p className="text-left md:text-right text-[#1B1B1B]/85 text-sm sm:text-base font-normal max-w-[290px] leading-relaxed">
                  The Champions Club is where premier racquet sport, vibrant community and play meet seamlessly.
                </p>
              </div>

              {/* BOTTOM: Giant Wordmark (Left) & Book a Court Button (Right) */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-2">
                {/* Giant Wordmark: champions club. */}
                <div className="font-bold tracking-tight lowercase leading-[0.88] select-none text-[clamp(3.8rem,9.5vw,9.8rem)] xl:text-[10.5rem]">
                  <div className="flex items-baseline">
                    <span className="text-[#E8883A]">c</span>
                    <span className="text-[#5F9E4A]">hampions</span>
                  </div>
                  <div className="text-[#5F9E4A]">club.</div>
                </div>

                {/* Bottom-right: Book a Court Pill Button */}
                <div className="sm:pb-4 sm:pr-2">
                  <Link
                    href="/login?redirect=/member/book"
                    className="inline-flex items-center justify-center gap-2.5 h-11 px-7 rounded-full bg-[#1B1B1B] hover:bg-black text-[#F6F5E1] text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-md group cursor-pointer"
                  >
                    <span>Book a Court</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (~45%): Green Illustration Panel */}
            <div className="w-full lg:w-[45%] h-[360px] sm:h-[480px] lg:h-full flex items-center justify-center">
              <CourtIllustration className="w-full h-full" />
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================
          FULL-SCREEN MOBILE MENU OVERLAY (< 768px)
         ======================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-[#F6F5E1] flex flex-col justify-between p-6 animate-in fade-in duration-200">
          {/* Top Bar inside Menu */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1B1B1B]/15">
            <div className="h-10 w-10 rounded-full border border-[#1B1B1B]/25 flex items-center justify-center font-bold text-xl select-none bg-white">
              <span className="text-[#E8883A]">c</span>
              <span className="text-[#5F9E4A]">.</span>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="h-10 w-10 rounded-full border border-[#1B1B1B]/25 hover:border-[#1B1B1B] flex items-center justify-center text-[#1B1B1B] cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links as Large Outlined / Active Pills */}
          <div className="flex flex-col gap-3 my-auto py-8">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full h-12 rounded-full text-base font-medium flex items-center justify-center transition-all ${
                    isActive
                      ? "bg-[#1B1B1B] text-[#F6F5E1]"
                      : "border border-[#1B1B1B]/30 text-[#1B1B1B] hover:bg-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Bottom Actions: Sign in and Sign up */}
          <div className="space-y-3 pt-4 border-t border-[#1B1B1B]/15">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full h-12 rounded-full border border-[#1B1B1B]/30 text-[#1B1B1B] font-medium text-sm flex items-center justify-center"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full h-12 rounded-full bg-[#E8883A] text-[#1B1B1B] font-semibold text-sm flex items-center justify-center shadow-sm"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
