"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X, LogOut, User } from "lucide-react";
import { signOut } from "@/lib/auth-client";

interface PublicNavbarProps {
  currentUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

const NAV_ITEMS = [
  { label: "Home", href: "#home", index: "01" },
  { label: "Courts", href: "#courts", index: "02" },
  { label: "Membership", href: "#membership", index: "03" },
  { label: "Pro Shop", href: "#shop", index: "04" },
  { label: "FAQ", href: "#faq", index: "05" },
  { label: "Contact", href: "#contact", index: "06" },
];

export function PublicNavbar({ currentUser }: PublicNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 40);

      const scrollPos = scrollY + 120;
      const sections = NAV_ITEMS.map((item) => item.href.substring(1));

      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el) {
          const top = el.offsetTop;
          if (scrollPos >= top) {
            setActiveSection(sections[i]);
            return;
          }
        }
      }
      setActiveSection("home");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const portalHref =
    currentUser?.role === "OWNER"
      ? "/admin/owner"
      : currentUser?.role === "STAFF"
      ? "/admin/members"
      : "/member";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full h-16 transition-colors duration-200 ${
        isScrolled
          ? "bg-white border-b border-[#E6E6E6] shadow-2xs"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-[1344px] h-full mx-auto px-4 sm:px-8 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link
          href="/"
          className={`font-brand font-black text-[20px] tracking-tight uppercase select-none transition-colors hover:opacity-85 ${
            isScrolled ? "text-[#111111]" : "text-white"
          }`}
          style={{ fontFamily: "var(--font-brand), system-ui, sans-serif" }}
        >
          CHAMPIONS CLUB
        </Link>

        {/* Centre: Nav links with tiny index numbers and active underline */}
        <nav className="hidden md:flex items-center gap-8 h-full">
          {NAV_ITEMS.map((item) => {
            const sectionId = item.href.substring(1);
            const isActive = activeSection === sectionId;
            return (
              <a
                key={item.label}
                href={item.href}
                className={`relative flex flex-col items-center justify-center h-full text-[14px] font-medium leading-none transition-colors group ${
                  isScrolled
                    ? isActive
                      ? "text-[#111111]"
                      : "text-[#111111]/75 hover:text-[#111111]"
                    : isActive
                    ? "text-white"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[10px] mt-1 font-mono transition-colors ${
                    isScrolled ? "text-[#6B6B6B]" : "text-white/60"
                  }`}
                >
                  {item.index}
                </span>
                {isActive && (
                  <span
                    className={`absolute bottom-0 left-0 right-0 h-[2px] ${
                      isScrolled ? "bg-[#111111]" : "bg-white"
                    }`}
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right: Auth / Action items */}
        <div className="hidden md:flex items-center gap-5">
          {currentUser ? (
            <>
              <Link
                href={portalHref}
                className={`h-10 px-5 rounded-full border text-xs font-semibold transition-all flex items-center gap-2 ${
                  isScrolled
                    ? "border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white"
                    : "border-white text-white hover:bg-white hover:text-[#111111]"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My account</span>
              </Link>
              <button
                onClick={async () => {
                  await signOut();
                  window.location.href = "/";
                }}
                className={`text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isScrolled
                    ? "text-[#6B6B6B] hover:text-[#111111]"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`text-xs font-medium transition-colors ${
                  isScrolled
                    ? "text-[#111111] hover:text-[#1F4A33]"
                    : "text-white hover:text-white/80"
                }`}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className={`h-10 px-5 rounded-full border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isScrolled
                    ? "border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white"
                    : "border-white text-white hover:bg-white hover:text-[#111111]"
                }`}
              >
                <span>Become a member</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu hamburger button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`md:hidden w-11 h-11 flex items-center justify-center rounded-lg transition-colors ${
            isScrolled
              ? "text-[#111111] hover:bg-neutral-100"
              : "text-white hover:bg-white/10"
          }`}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-white border-b border-[#E6E6E6] shadow-xl p-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <nav className="flex flex-col space-y-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="h-12 px-4 rounded-xl flex items-center justify-between text-base font-medium text-[#111111] hover:bg-[#EFEFEF] transition-colors"
              >
                <span>{item.label}</span>
                <span className="text-xs text-[#6B6B6B] font-mono">{item.index}</span>
              </a>
            ))}
          </nav>

          <div className="pt-6 mt-4 border-t border-[#E6E6E6] flex flex-col gap-3">
            {currentUser ? (
              <>
                <Link
                  href={portalHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-12 rounded-full border border-[#111111] text-[#111111] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#111111] hover:text-white transition-all"
                >
                  <User className="w-4 h-4" />
                  <span>My account</span>
                </Link>
                <button
                  onClick={async () => {
                    await signOut();
                    window.location.href = "/";
                  }}
                  className="h-12 rounded-full text-sm font-medium text-[#6B6B6B] hover:text-[#111111] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-12 rounded-full border border-[#111111] text-[#111111] text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#111111] hover:text-white transition-all"
                >
                  <span>Become a member</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-12 rounded-full text-sm font-medium text-[#111111] flex items-center justify-center hover:bg-[#EFEFEF] transition-colors"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
