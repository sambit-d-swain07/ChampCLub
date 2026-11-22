import type { Metadata } from "next";
import Link from "next/link";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { siteSettings, formatInr } from "@/lib/site-settings";
import { getCourtImageBySportIndex } from "@/lib/court-images";
import { PublicNavbar } from "@/components/public/public-navbar";
import { ClubImage } from "@/components/public/club-image";
import { CourtsOverview } from "@/components/public/courts-overview";
import { BookingBannerCard } from "@/components/public/booking-banner-card";
import { FaqAccordion } from "@/components/public/faq-accordion";
import { ArrowUpRight, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "CHAMPIONS CLUB · Tennis, Padel & Badminton",
  description:
    "Six championship courts, a pro shop and a clubhouse bar. Book a session in a few taps with instant member discounts.",
  openGraph: {
    title: "CHAMPIONS CLUB · Tennis, Padel & Badminton",
    description:
      "Six championship courts, a pro shop and a clubhouse bar. Book a session in a few taps with instant member discounts.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [currentUser, plans, dbCourts, distinctCategories, pricingRules] = await Promise.all([
    getCurrentUser().catch(() => null),
    withDbRetry(() =>
      prisma.plan.findMany({
        orderBy: { price: "desc" },
      })
    ),
    withDbRetry(() =>
      prisma.court.findMany({
        where: { archivedAt: null },
        orderBy: [{ sport: "asc" }, { name: "asc" }],
      })
    ),
    withDbRetry(() =>
      prisma.product.findMany({
        where: { archivedAt: null },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      })
    ),
    withDbRetry(() =>
      prisma.pricingRule.findMany({
        where: { planId: null },
      })
    ),
  ]);

  const courtCount = dbCourts.length || 6;
  const sports = Array.from(new Set(dbCourts.map((c) => c.sport))).sort();

  // Price map by sport
  const priceBySport: Record<string, number> = {};
  for (const rule of pricingRules) {
    priceBySport[rule.sport.toUpperCase()] = Number(rule.basePrice);
  }

  // Fallback prices if no pricing rule found
  const getSportBasePrice = (sport: string): number => {
    const s = sport.toUpperCase();
    if (priceBySport[s]) return priceBySport[s];
    if (s === "TENNIS") return 800;
    if (s === "PADEL") return 1200;
    if (s === "BADMINTON") return 600;
    return 800;
  };

  const sportCounters: Record<string, number> = {};
  const activeCourts = dbCourts.map((c) => {
    const sportKey = c.sport.toUpperCase();
    const indexWithinSport = sportCounters[sportKey] || 0;
    sportCounters[sportKey] = indexWithinSport + 1;
    const imageItem = getCourtImageBySportIndex(c.sport, indexWithinSport);

    return {
      id: c.id,
      name: c.name,
      sport: c.sport,
      capacity: c.capacity,
      basePrice: getSportBasePrice(c.sport),
      imageItem,
    };
  });

  const categories = distinctCategories.map((c) => c.category);

  // Order plans: JUNIOR, SILVER, GOLD
  const planOrder = ["JUNIOR", "SILVER", "GOLD"];
  const sortedPlans = [...plans].sort((a, b) => {
    const aIdx = planOrder.indexOf(a.name.toUpperCase());
    const bIdx = planOrder.indexOf(b.name.toUpperCase());
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    return Number(a.price) - Number(b.price);
  });

  return (
    <div className="bg-white text-[#111111] min-h-screen selection:bg-[#1F4A33] selection:text-white">
      {/* ===================== STICKY NAVIGATION ===================== */}
      <PublicNavbar currentUser={currentUser} />

      {/* ===================== FULL-BLEED HERO SECTION ===================== */}
      <section
        id="home"
        className="relative w-full h-[100svh] min-h-[640px] overflow-hidden flex flex-col justify-center items-center bg-[#1F4A33]"
      >
        {/* Full-screen background image edge-to-edge */}
        <ClubImage
          src="/images/hero-court.webp"
          alt="Aerial view of championship tennis court surrounded by lush trees"
          sportName="THE CHAMPIONS CLUB"
          priority={true}
          fill
          sizes="100vw"
          quality={80}
          className="object-cover"
        />

        {/* Contrast dark overlay: linear-gradient from 0.45 at bottom to 0.25 at top */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/35 to-black/25 z-10 pointer-events-none" />

        {/* Centered Hero Content */}
        <div className="relative z-20 flex flex-col items-center text-center px-4 max-w-5xl mx-auto pt-16">
          <h1
            className="font-anton text-white uppercase text-center whitespace-normal md:whitespace-nowrap [text-wrap:balance] tracking-normal leading-none"
            style={{ fontSize: "clamp(56px, 9vw, 128px)" }}
          >
            THE CHAMPIONS CLUB
          </h1>

          <p className="mt-4 sm:mt-6 text-white text-base sm:text-lg md:text-xl font-normal tracking-wide max-w-xl">
            Tennis, padel and badminton. Book in a few taps.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#book-court"
              className="h-11 px-7 rounded-full bg-white text-[#111111] text-xs sm:text-sm font-semibold hover:bg-white/90 transition-colors flex items-center justify-center shadow-md cursor-pointer"
            >
              Book a court
            </a>
            <Link
              href="/signup"
              className="h-11 px-7 rounded-full border border-white text-white text-xs sm:text-sm font-semibold hover:bg-white/15 transition-colors flex items-center justify-center"
            >
              Become a member
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== MAIN CONTENT CONTAINER ===================== */}
      <main className="max-w-[1344px] mx-auto px-4 sm:px-8 py-16 sm:py-20 lg:py-24 space-y-24">
        {/* ===================== COURTS OVERVIEW ===================== */}
        <section id="overview" className="scroll-mt-16">
          <CourtsOverview
            courtCount={courtCount}
            sports={sports}
            hours={siteSettings.hours}
          />
        </section>

        {/* ===================== COURTS GRID ===================== */}
        <section id="courts" className="scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-8 gap-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                FACILITIES
              </span>
              <h2 className="font-anton text-4xl sm:text-[56px] leading-none uppercase text-[#111111] mt-2">
                ALL COURTS
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#6B6B6B] max-w-sm">
              Each court features tournament-grade lighting, precise lines and seamless online booking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {activeCourts.map((court, idx) => {
              const total = activeCourts.length;
              const desktopRemainder = total % 3;
              const tabletRemainder = total % 2;

              const isLastSingleDesktop = desktopRemainder === 1 && idx === total - 1;
              const isLastPairDesktop = desktopRemainder === 2 && idx >= total - 2;
              const isLastSingleTablet = tabletRemainder === 1 && idx === total - 1;

              const colSpanClass = `col-span-1 ${
                isLastSingleTablet ? "md:col-span-2" : "md:col-span-1"
              } ${
                isLastSingleDesktop
                  ? "lg:col-span-6"
                  : isLastPairDesktop
                  ? "lg:col-span-3"
                  : "lg:col-span-2"
              }`;

              const aspectClass = isLastSingleDesktop ? "aspect-[21/9]" : "aspect-[4/3]";
              const bookingUrl = currentUser
                ? `/member/book?court=${court.id}`
                : `/login?next=${encodeURIComponent(`/member/book?court=${court.id}`)}`;

              return (
                <div key={court.id} className={`${colSpanClass} group flex flex-col`}>
                  {/* Card Image Container */}
                  <div className={`relative ${aspectClass} w-full rounded-[14px] overflow-hidden bg-[#1F4A33] shadow-xs`}>
                    <ClubImage
                      src={court.imageItem.src}
                      alt={court.imageItem.alt}
                      sportName={court.sport}
                      priority={false}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
                    />

                    {/* Circular Action Button at bottom-right */}
                    <Link
                      href={bookingUrl}
                      aria-label={`Book ${court.name}`}
                      className="w-10 h-10 rounded-full bg-white text-[#111111] flex items-center justify-center absolute bottom-3 right-3 shadow-md hover:scale-105 transition-transform z-10"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Details below image */}
                  <div className="mt-3 flex flex-col">
                    <h3 className="text-[14px] font-semibold text-[#111111] leading-snug">
                      {court.name}
                    </h3>
                    <div className="mt-1 flex items-center justify-between text-[12px]">
                      <span className="text-[#6B6B6B]">
                        {court.sport.charAt(0) + court.sport.slice(1).toLowerCase()}, capacity {court.capacity}
                      </span>
                      <span className="font-medium text-[#111111]">
                        from {formatInr(court.basePrice)}/hr
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================== BOOK YOUR COURT BANNER ===================== */}
        <section id="book-court" className="scroll-mt-16">
          <div className="relative w-full rounded-[20px] overflow-hidden bg-[#1F4A33] p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-12 shadow-md">
            {/* Background image & dark overlay */}
            <ClubImage
              src="/images/banner-ball.webp"
              alt="Macro tennis ball and racket on blue tournament court"
              sportName="BOOK YOUR COURT"
              priority={false}
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-black/35 z-10 pointer-events-none" />

            {/* Left Content */}
            <div className="relative z-20 flex flex-col items-start max-w-xl text-left">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/80 mb-2">
                RESERVATIONS
              </span>
              <h2 className="font-anton text-4xl sm:text-6xl lg:text-[72px] leading-none uppercase text-white">
                BOOK YOUR COURT
              </h2>
              <p className="mt-4 text-white/90 text-sm sm:text-base leading-relaxed">
                Choose your sport, select an available date, and lock in your session in seconds. Member discounts apply automatically.
              </p>
              <a
                href="#courts"
                className="mt-6 h-10 px-6 rounded-full bg-white text-[#111111] text-xs font-semibold hover:bg-white/90 transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>Explore courts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Right Content: Floating Card */}
            <div className="relative z-20 w-full lg:w-auto flex justify-center">
              <BookingBannerCard
                courts={activeCourts}
                isLoggedIn={!!currentUser}
              />
            </div>
          </div>
        </section>

        {/* ===================== MEMBERSHIP ===================== */}
        <section id="membership" className="scroll-mt-16">
          <div className="mb-10 text-center sm:text-left">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
              TIERS & PRIVILEGES
            </span>
            <h2 className="font-anton text-4xl sm:text-[56px] leading-none uppercase text-[#111111] mt-2">
              MEMBERSHIP
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-stretch">
            {sortedPlans.map((plan, idx) => {
              const totalPlans = sortedPlans.length;
              const desktopRemainder = totalPlans % 3;
              const tabletRemainder = totalPlans % 2;

              const isLastSingleDesktop = desktopRemainder === 1 && idx === totalPlans - 1;
              const isLastPairDesktop = desktopRemainder === 2 && idx >= totalPlans - 2;
              const isLastSingleTablet = tabletRemainder === 1 && idx === totalPlans - 1;

              const planColSpanClass = `col-span-1 ${
                isLastSingleTablet ? "md:col-span-2" : "md:col-span-1"
              } ${
                isLastSingleDesktop
                  ? "lg:col-span-6"
                  : isLastPairDesktop
                  ? "lg:col-span-3"
                  : "lg:col-span-2"
              }`;

              const isGold = plan.name.toUpperCase() === "GOLD";
              const isJunior = plan.name.toUpperCase() === "JUNIOR";
              const durationLabel =
                plan.durationDays >= 365 ? "365 days" : `${plan.durationDays} days`;

              return (
                <div
                  key={plan.id}
                  className={`${planColSpanClass} rounded-[14px] p-8 flex flex-col justify-between transition-all ${
                    isGold
                      ? "bg-[#1F4A33] text-white shadow-xl"
                      : "bg-white border border-[#E6E6E6] text-[#111111] shadow-2xs hover:border-[#111111]/40"
                  }`}
                >
                  <div>
                    {/* Plan Name */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                          isGold ? "text-white/80" : "text-[#6B6B6B]"
                        }`}
                      >
                        {plan.name} PLAN
                      </span>
                      {isGold && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-white/20 text-white">
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Price and Duration */}
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-anton text-[48px] leading-none">
                        {formatInr(Number(plan.price))}
                      </span>
                      <span
                        className={`text-xs ${
                          isGold ? "text-white/70" : "text-[#6B6B6B]"
                        }`}
                      >
                        / {durationLabel}
                      </span>
                    </div>

                    {/* Divider */}
                    <div
                      className={`my-6 border-t ${
                        isGold ? "border-white/20" : "border-[#E6E6E6]"
                      }`}
                    />

                    {/* Privilege Rows */}
                    <ul className="space-y-3 text-xs leading-relaxed">
                      <li className="flex items-center justify-between">
                        <span className={isGold ? "text-white/80" : "text-[#6B6B6B]"}>
                          Courts discount
                        </span>
                        <span className="font-semibold">
                          {Number(plan.courtDiscountPct)}% off
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className={isGold ? "text-white/80" : "text-[#6B6B6B]"}>
                          Pro Shop gear
                        </span>
                        <span className="font-semibold">
                          {Number(plan.shopDiscountPct)}% off
                        </span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className={isGold ? "text-white/80" : "text-[#6B6B6B]"}>
                          Champions Bar
                        </span>
                        <span className="font-semibold">
                          {Number(plan.barDiscountPct)}% off
                        </span>
                      </li>
                    </ul>

                    {isJunior && (
                      <p
                        className={`text-xs mt-4 pt-4 border-t ${
                          isGold ? "border-white/20 text-white/80" : "border-[#E6E6E6] text-[#6B6B6B]"
                        }`}
                      >
                        For under 18. Age verified at the front desk.
                      </p>
                    )}
                  </div>

                  {/* Choose Plan CTA */}
                  <div className="mt-8 pt-4">
                    <Link
                      href={currentUser ? "/member/plan" : "/signup"}
                      className={`w-full h-11 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-all ${
                        isGold
                          ? "bg-white text-[#1F4A33] hover:bg-neutral-100"
                          : "bg-[#111111] text-white hover:bg-black"
                      }`}
                    >
                      Choose {plan.name}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===================== PRO SHOP ===================== */}
        <section id="shop" className="scroll-mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
            {/* Left: Image card */}
            <div className="lg:col-span-7">
              <div className="relative aspect-[16/10] w-full rounded-[20px] overflow-hidden bg-[#1F4A33] shadow-sm">
                <ClubImage
                  src="/images/shop.webp"
                  alt="Champions Club Pro Shop equipment rackets and balls"
                  sportName="PRO SHOP"
                  priority={false}
                  fill
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Right: Text and Categories */}
            <div className="lg:col-span-5 flex flex-col justify-center">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                PRO SHOP
              </span>
              <h2 className="font-anton text-4xl sm:text-5xl lg:text-[56px] leading-none uppercase text-[#111111] mt-3 mb-6">
                GEAR UP BEFORE YOU PLAY
              </h2>
              <p className="text-sm sm:text-base text-[#6B6B6B] leading-relaxed mb-6">
                Pick up tournament rackets, fresh balls, shoes and grips at the clubhouse front desk, request courtside delivery directly to your court during play, or order for same-day home delivery from our live inventory.
              </p>

              {/* Real DB categories as outlined pills */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className="px-3.5 py-1.5 rounded-full border border-[#E6E6E6] text-xs font-medium text-[#111111]"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Button */}
              <div>
                <Link
                  href={currentUser ? "/member/shop" : "/login?next=/member/shop"}
                  className="h-11 px-7 rounded-full bg-[#1F4A33] hover:bg-[#163826] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors shadow-sm"
                >
                  <span>Open the Pro Shop</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== FAQ ===================== */}
        <section id="faq" className="scroll-mt-16">
          <div className="mb-8">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
              QUESTIONS & ANSWERS
            </span>
            <h2 className="font-anton text-4xl sm:text-[56px] leading-none uppercase text-[#111111] mt-2">
              FAQ
            </h2>
          </div>

          <FaqAccordion />
        </section>
      </main>

      {/* ===================== FOOTER ===================== */}
      <footer id="contact" className="w-full bg-white border-t border-[#E6E6E6] mt-24 py-16">
        <div className="max-w-[1344px] mx-auto px-4 sm:px-8 space-y-12">
          {/* Top Row: Brand & Uppercase Navigation Links */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[#E6E6E6]">
            <Link
              href="/"
              className="font-brand font-black text-[22px] tracking-tight uppercase text-[#111111] select-none hover:opacity-85 transition-opacity"
              style={{ fontFamily: "var(--font-brand), system-ui, sans-serif" }}
            >
              CHAMPIONS CLUB
            </Link>

            <nav className="flex flex-wrap items-center gap-6 sm:gap-8 text-[12px] font-semibold tracking-wider uppercase text-[#111111]">
              <a href="#home" className="hover:text-[#1F4A33] transition-colors">
                HOME
              </a>
              <a href="#courts" className="hover:text-[#1F4A33] transition-colors">
                COURTS
              </a>
              <a href="#membership" className="hover:text-[#1F4A33] transition-colors">
                MEMBERSHIP
              </a>
              <a href="#shop" className="hover:text-[#1F4A33] transition-colors">
                PRO SHOP
              </a>
              <a href="#faq" className="hover:text-[#1F4A33] transition-colors">
                FAQ
              </a>
              <a href="#contact" className="hover:text-[#1F4A33] transition-colors">
                CONTACT
              </a>
            </nav>
          </div>

          {/* Bottom Row: Description on left, Contact Details on right */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 text-xs text-[#6B6B6B]">
            <div className="max-w-md space-y-2">
              <p className="leading-relaxed">
                {siteSettings.tagline}
              </p>
              <p className="text-[11px] text-[#6B6B6B]/80 font-mono">
                © {new Date().getFullYear()} {siteSettings.name}. All rights reserved.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-6 sm:gap-12 leading-relaxed text-left sm:text-right">
              {siteSettings.address && (
                <div>
                  <span className="font-semibold text-[#111111] block mb-0.5">Location</span>
                  <span>{siteSettings.address}</span>
                  {siteSettings.city && <span className="block">{siteSettings.city}</span>}
                </div>
              )}

              {(siteSettings.phone || siteSettings.email) && (
                <div>
                  <span className="font-semibold text-[#111111] block mb-0.5">Concierge</span>
                  {siteSettings.phone && <span className="block">{siteSettings.phone}</span>}
                  {siteSettings.email && <span className="block">{siteSettings.email}</span>}
                </div>
              )}

              {siteSettings.hours && (
                <div>
                  <span className="font-semibold text-[#111111] block mb-0.5">Club Hours</span>
                  <span>{siteSettings.hours}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
