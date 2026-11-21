import type { Metadata } from "next";
import Link from "next/link";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { siteSettings, formatInr } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Champions Club · Tennis, Padel & Badminton",
  description:
    "Six courts, a pro shop and a bar. Book a session in a few taps and your member discount is applied for you.",
  openGraph: {
    title: "Champions Club · Tennis, Padel & Badminton",
    description:
      "Six courts, a pro shop and a bar. Book a session in a few taps and your member discount is applied for you.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [currentUser, plans, dbCourts, distinctCategories] = await Promise.all([
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
  ]);

  const courtCount = dbCourts.length || 6;
  const sports = Array.from(new Set(dbCourts.map((c) => c.sport))).sort();
  const sportsCount = sports.length || 3;

  // Determine user account portal destination
  const portalHref =
    currentUser?.role === "OWNER"
      ? "/admin/owner"
      : currentUser?.role === "STAFF"
      ? "/admin/members"
      : "/member";

  // Group surfaces by sport for the Courts section
  const courtsBySport = sports.map((sport, idx) => {
    const courtsForSport = dbCourts.filter((c) => c.sport === sport);
    const count = courtsForSport.length;
    const surfaces = courtsForSport
      .map((c) => {
        const match = c.name.match(/\(([^)]+)\)/);
        return match ? match[1].toLowerCase() : c.name;
      })
      .join(" and ");

    const countInWords =
      count === 1 ? "One court" : count === 2 ? "Two courts" : `${count} courts`;

    const sportDisplayName =
      sport.charAt(0) + sport.slice(1).toLowerCase();

    return {
      index: String(idx + 1).padStart(2, "0"),
      sportName: sportDisplayName,
      detail: surfaces ? `${countInWords} · ${surfaces}` : countInWords,
    };
  });

  const categories = distinctCategories.map((c) => c.category);

  return (
    <div className="bg-[#F6F4EE] text-[#15201A] min-h-screen selection:bg-[#23513C] selection:text-white">
      {/* ===================== HERO SECTION ===================== */}
      <section className="relative w-full min-h-[780px] bg-[#A9CDE8] overflow-hidden flex flex-col justify-between">
        {/* Top-down Tennis Court SVG Background */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <svg
            viewBox="0 0 1440 760"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
            role="img"
            aria-label="Top-down illustration of a tennis court with players and ball"
          >
            {/* Surround */}
            <rect width="1440" height="760" fill="#A9CDE8" />

            {/* Main Court Rectangle */}
            <rect
              x="80"
              y="50"
              width="1280"
              height="660"
              rx="4"
              fill="#8FBBE0"
            />

            {/* Outer Baseline & Doubles Sidelines */}
            <rect
              x="140"
              y="90"
              width="1160"
              height="580"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeOpacity="0.8"
            />

            {/* Singles Sidelines (Top & Bottom) */}
            <line
              x1="140"
              y1="160"
              x2="1300"
              y2="160"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeOpacity="0.8"
            />
            <line
              x1="140"
              y1="600"
              x2="1300"
              y2="600"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeOpacity="0.8"
            />

            {/* Service Lines (Left & Right) */}
            <line
              x1="430"
              y1="160"
              x2="430"
              y2="600"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeOpacity="0.8"
            />
            <line
              x1="1010"
              y1="160"
              x2="1010"
              y2="600"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeOpacity="0.8"
            />

            {/* Centre Service Line */}
            <line
              x1="430"
              y1="380"
              x2="1010"
              y2="380"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeOpacity="0.8"
            />

            {/* Centre Service Tick Marks on Baselines */}
            <line
              x1="140"
              y1="380"
              x2="158"
              y2="380"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeOpacity="0.8"
            />
            <line
              x1="1282"
              y1="380"
              x2="1300"
              y2="380"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeOpacity="0.8"
            />

            {/* Dashed Net Line Down the Middle */}
            <line
              x1="720"
              y1="65"
              x2="720"
              y2="695"
              stroke="#FFFFFF"
              strokeWidth="3"
              strokeDasharray="6 6"
              strokeOpacity="0.85"
            />
            {/* Net Posts */}
            <circle cx="720" cy="65" r="5" fill="#FFFFFF" opacity="0.9" />
            <circle cx="720" cy="695" r="5" fill="#FFFFFF" opacity="0.9" />

            {/* ---- 4 TOP-DOWN PLAYERS WITH SOFT ROTATED SHADOWS (-52 deg, 24% opacity) ---- */}
            {/* Player 1 (Upper Right Near Net/Service) */}
            <g>
              <ellipse
                cx="880"
                cy="290"
                rx="16"
                ry="105"
                fill="#0F2236"
                opacity="0.24"
                transform="rotate(-52 880 290)"
              />
              {/* Shoulders */}
              <ellipse cx="900" cy="245" rx="13" ry="7" fill="#E8883A" />
              {/* Head */}
              <circle cx="900" cy="245" r="6" fill="#15201A" />
              {/* Arm & Racket */}
              <line x1="910" y1="245" x2="925" y2="230" stroke="#15201A" strokeWidth="2.5" />
              <ellipse cx="935" cy="220" rx="9" ry="14" fill="none" stroke="#15201A" strokeWidth="2" transform="rotate(25 935 220)" />
            </g>

            {/* Player 2 (Upper Right Baseline) */}
            <g>
              <ellipse
                cx="1140"
                cy="230"
                rx="18"
                ry="120"
                fill="#0F2236"
                opacity="0.24"
                transform="rotate(-52 1140 230)"
              />
              <ellipse cx="1165" cy="180" rx="14" ry="7.5" fill="#FFFFFF" />
              <circle cx="1165" cy="180" r="6" fill="#F6F4EE" />
              <line x1="1175" y1="180" x2="1195" y2="165" stroke="#0F2236" strokeWidth="2.5" />
              <ellipse cx="1205" cy="155" rx="9" ry="14" fill="none" stroke="#0F2236" strokeWidth="2" transform="rotate(35 1205 155)" />
            </g>

            {/* Player 3 (Lower Right Near Service) */}
            <g>
              <ellipse
                cx="1120"
                cy="490"
                rx="17"
                ry="110"
                fill="#0F2236"
                opacity="0.24"
                transform="rotate(-52 1120 490)"
              />
              <ellipse cx="1145" cy="445" rx="13" ry="7" fill="#BF3F0D" />
              <circle cx="1145" cy="445" r="6" fill="#F6F4EE" />
            </g>

            {/* Player 4 (Left Side Court) */}
            <g>
              <ellipse
                cx="830"
                cy="370"
                rx="16"
                ry="100"
                fill="#0F2236"
                opacity="0.24"
                transform="rotate(-52 830 370)"
              />
              <ellipse cx="850" cy="330" rx="13" ry="7" fill="#FBFAF6" />
              <circle cx="850" cy="330" r="6" fill="#15201A" />
            </g>

            {/* Yellow-Green Tennis Ball */}
            <circle cx="730" cy="330" r="5.5" fill="#D4E157" />
          </svg>
        </div>

        {/* Top Navigation */}
        <header className="relative z-10 w-full pt-6">
          <div className="max-w-[1200px] mx-auto px-8 flex items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 text-[#0F2236] font-heading font-bold text-xl tracking-tight"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#23513C] shrink-0" />
              <span>Champions Club</span>
            </Link>

            {/* Centre Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#0F2236]/80">
              <a href="#courts" className="hover:text-[#0F2236] transition-opacity">
                Courts
              </a>
              <a href="#how-it-works" className="hover:text-[#0F2236] transition-opacity">
                How it works
              </a>
              <a href="#membership" className="relative hover:text-[#0F2236] transition-opacity py-1">
                Membership
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0F2236]" />
              </a>
              <a href="#pro-shop" className="hover:text-[#0F2236] transition-opacity">
                Pro Shop
              </a>
              <a href="#contact" className="hover:text-[#0F2236] transition-opacity">
                Contact
              </a>
            </nav>

            {/* Right Action */}
            <div className="flex items-center gap-4">
              {currentUser ? (
                <Link
                  href={portalHref}
                  className="bg-[#23513C] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Open my account
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-[#0F2236] hover:opacity-80 transition-opacity"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-[#23513C] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Hero Bottom Content */}
        <div className="relative z-10 w-full pb-14 pt-24 sm:pt-36">
          <div className="max-w-[1200px] mx-auto px-8 flex flex-col md:flex-row md:items-end justify-between gap-10">
            {/* Bottom Left: Tagline & Giant Headline */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-[1px] bg-[#0F2236]" />
                <span className="text-xs uppercase tracking-widest font-semibold text-[#0F2236]">
                  Tennis · Padel · Badminton
                </span>
              </div>
              <h1 className="font-heading font-bold text-[#0F2236] text-[clamp(72px,12vw,144px)] leading-[0.88] tracking-[-0.055em]">
                <span className="text-[#BF3F0D]">c</span>hampions<br />
                club.
              </h1>
            </div>

            {/* Bottom Right: Pitch & Actions */}
            <div className="md:max-w-[300px] md:text-right space-y-5">
              <p className="text-sm text-[#0F2236]/90 leading-relaxed">
                Six courts, a pro shop and a bar. Book a session in a few taps and your member discount is applied for you.
              </p>
              <div className="flex flex-wrap md:justify-end gap-3">
                <Link
                  href={currentUser ? "/member/book" : "/login?redirect=/member/book"}
                  className="bg-[#0F2236] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Book a court
                </Link>
                <Link
                  href="/signup"
                  className="border border-[#0F2236] text-[#0F2236] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#0F2236]/5 transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FACTS STRIP ===================== */}
      <section className="w-full bg-[#F6F4EE]">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 border-y border-[#D9D5C9] py-8 gap-6 md:gap-0">
            <div className="md:pr-8 md:border-r border-[#D9D5C9]">
              <div className="font-heading font-semibold text-3xl sm:text-4xl text-[#15201A]">
                {courtCount}
              </div>
              <div className="text-sm text-[#55605A] mt-1">Courts</div>
            </div>

            <div className="md:px-8 md:border-r border-[#D9D5C9]">
              <div className="font-heading font-semibold text-3xl sm:text-4xl text-[#15201A]">
                {sportsCount}
              </div>
              <div className="text-sm text-[#55605A] mt-1">Sports</div>
            </div>

            <div className="md:px-8 md:border-r border-[#D9D5C9]">
              <div className="font-heading font-semibold text-3xl sm:text-4xl text-[#15201A]">
                60 min
              </div>
              <div className="text-sm text-[#55605A] mt-1">Per session</div>
            </div>

            <div className="md:pl-8">
              <div className="font-heading font-semibold text-3xl sm:text-4xl text-[#15201A]">
                30 min
              </div>
              <div className="text-sm text-[#55605A] mt-1">Between start times</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== COURTS SECTION ===================== */}
      <section id="courts" className="w-full py-24 bg-[#F6F4EE]">
        <div className="max-w-[1200px] mx-auto px-8 space-y-12">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-[#55605A]">
                Courts
              </div>
              <h2 className="font-heading font-semibold text-3xl sm:text-5xl tracking-[-0.04em] leading-[1.08] text-[#15201A]">
                Three sports, <span className="font-serif italic font-normal text-[#23513C]">six</span> courts.
              </h2>
            </div>
            <p className="text-sm text-[#55605A] md:max-w-xs md:text-right">
              Every court is booked in 60-minute sessions, with a new start time every half hour.
            </p>
          </div>

          {/* Sports List */}
          <div className="border-y border-[#D9D5C9] divide-y divide-[#D9D5C9]">
            {courtsBySport.map((row) => (
              <div
                key={row.sportName}
                className="py-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-3"
              >
                <div className="flex items-baseline gap-6 sm:gap-10">
                  <span className="font-mono text-xs text-[#55605A]">{row.index}</span>
                  <span className="font-heading font-semibold text-2xl sm:text-4xl text-[#15201A]">
                    {row.sportName}
                  </span>
                </div>
                <div className="text-sm text-[#55605A] sm:text-right">
                  {row.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS SECTION ===================== */}
      <section id="how-it-works" className="w-full py-24 bg-[#F6F4EE]">
        <div className="max-w-[1200px] mx-auto px-8 space-y-12">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-[#55605A]">
                How it works
              </div>
              <h2 className="font-heading font-semibold text-3xl sm:text-5xl tracking-[-0.04em] leading-[1.08] text-[#15201A]">
                From sign up to <span className="font-serif italic font-normal text-[#23513C]">first serve.</span>
              </h2>
            </div>
            <p className="text-sm text-[#55605A] md:max-w-xs md:text-right">
              Three simple steps, and you are on court.
            </p>
          </div>

          {/* Three Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            <div className="border-t border-[#15201A] pt-6 space-y-2">
              <div className="font-mono text-xs text-[#55605A]">01</div>
              <h3 className="font-heading font-semibold text-xl text-[#15201A]">
                Create your account
              </h3>
              <p className="text-sm text-[#55605A] leading-relaxed">
                Sign up with your name, phone and email. It takes under a minute.
              </p>
            </div>

            <div className="border-t border-[#15201A] pt-6 space-y-2">
              <div className="font-mono text-xs text-[#55605A]">02</div>
              <h3 className="font-heading font-semibold text-xl text-[#15201A]">
                Choose a plan
              </h3>
              <p className="text-sm text-[#55605A] leading-relaxed">
                Pick Junior, Silver or Gold whenever you are ready, and change it later.
              </p>
            </div>

            <div className="border-t border-[#15201A] pt-6 space-y-2">
              <div className="font-mono text-xs text-[#55605A]">03</div>
              <h3 className="font-heading font-semibold text-xl text-[#15201A]">
                Book your slot
              </h3>
              <p className="text-sm text-[#55605A] leading-relaxed">
                Choose a sport, a day and a time. Your member discount is applied for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== MEMBERSHIP SECTION ===================== */}
      <section id="membership" className="w-full py-24 bg-[#F6F4EE]">
        <div className="max-w-[1200px] mx-auto px-8 space-y-12">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-widest text-[#55605A]">
                Membership
              </div>
              <h2 className="font-heading font-semibold text-3xl sm:text-5xl tracking-[-0.04em] leading-[1.08] text-[#15201A]">
                Membership, <span className="font-serif italic font-normal text-[#23513C]">kept simple.</span>
              </h2>
            </div>
            <p className="text-sm text-[#55605A] md:max-w-xs md:text-right">
              Choose a plan after you sign up. Your discounts apply automatically at the courts, the shop and the bar.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {plans.map((p) => {
              const nameUpper = p.name.toUpperCase();
              const isGold = nameUpper === "GOLD";
              const isJunior = nameUpper.includes("JUNIOR");
              const isSilver = nameUpper === "SILVER";

              // Duration label: show days if not whole months, or Junior shows 365 days
              let durationLabel = "";
              if (isJunior) {
                durationLabel = `${p.durationDays} days`;
              } else if (p.durationDays % 30 === 0) {
                durationLabel = `${Math.round(p.durationDays / 30)} months`;
              } else if (p.durationDays === 365) {
                durationLabel = "12 months";
              } else {
                durationLabel = `${p.durationDays} days`;
              }

              const description = isJunior
                ? "For members under 18"
                : isSilver
                ? "Standard membership"
                : "Full access, best savings";

              const chooseHref = currentUser ? "/member/plan" : "/signup";

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl p-8 flex flex-col justify-between transition-shadow ${
                    isGold
                      ? "bg-[#23513C] text-white shadow-md"
                      : "bg-[#FBFAF6] text-[#15201A] border border-[#D9D5C9]"
                  }`}
                >
                  <div className="space-y-6">
                    <div>
                      <div
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isGold ? "text-white/80" : "text-[#55605A]"
                        }`}
                      >
                        {p.name}
                      </div>
                      <div
                        className={`text-sm mt-1 ${
                          isGold ? "text-white/90" : "text-[#55605A]"
                        }`}
                      >
                        {description}
                      </div>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="font-heading font-semibold text-4xl sm:text-[44px]">
                        {formatInr(Number(p.price))}
                      </span>
                      <span
                        className={`text-xs ${
                          isGold ? "text-white/70" : "text-[#55605A]"
                        }`}
                      >
                        {durationLabel}
                      </span>
                    </div>

                    <div
                      className={`border-t pt-5 space-y-3 text-sm ${
                        isGold ? "border-white/20" : "border-[#D9D5C9]"
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className={isGold ? "text-white/80" : "text-[#55605A]"}>Courts</span>
                        <span className="font-semibold">{Number(p.courtDiscountPct)}% off</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isGold ? "text-white/80" : "text-[#55605A]"}>Pro Shop</span>
                        <span className="font-semibold">{Number(p.shopDiscountPct)}% off</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={isGold ? "text-white/80" : "text-[#55605A]"}>Bar</span>
                        <span className="font-semibold">{Number(p.barDiscountPct)}% off</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Link
                      href={chooseHref}
                      className={`block w-full py-3 rounded-full text-center text-sm font-semibold transition-colors ${
                        isGold
                          ? "bg-[#F6F4EE] text-[#15201A] hover:bg-white"
                          : "border border-[#15201A] text-[#15201A] hover:bg-[#15201A]/5"
                      }`}
                    >
                      Choose {p.name.charAt(0) + p.name.slice(1).toLowerCase()}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== PRO SHOP SECTION ===================== */}
      <section id="pro-shop" className="w-full py-24 bg-[#F6F4EE]">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-widest text-[#55605A]">
                  Pro Shop
                </div>
                <h2 className="font-heading font-semibold text-3xl sm:text-5xl tracking-[-0.04em] leading-[1.08] text-[#15201A]">
                  Gear up <span className="font-serif italic font-normal text-[#23513C]">before you play.</span>
                </h2>
              </div>
              <p className="text-sm text-[#55605A] leading-relaxed max-w-md">
                Order from your account and collect at the desk, pick it up courtside, or have it delivered home. The shop and the counter share one stock, so what you see is what is there.
              </p>
              <div>
                <Link
                  href={currentUser ? "/member/shop" : "/login?redirect=/member/shop"}
                  className="inline-block bg-[#23513C] text-white px-6 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Open the Pro Shop
                </Link>
              </div>
            </div>

            {/* Right Categories */}
            <div className="flex flex-wrap gap-2.5 md:justify-end">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="px-5 py-2 rounded-full border border-[#D9D5C9] bg-white text-sm text-[#15201A] shadow-2xs"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CLOSING BANNER ===================== */}
      <section className="w-full pb-16 bg-[#F6F4EE]">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="bg-[#23513C] text-white rounded-[24px] p-12 sm:p-16 text-center space-y-4">
            <h2 className="font-heading font-semibold text-3xl sm:text-5xl tracking-[-0.04em] leading-tight">
              Your court is <span className="font-serif italic font-normal text-[#A9CDE8]">waiting.</span>
            </h2>
            <p className="text-sm text-white/80 max-w-md mx-auto">
              Create an account, choose a plan and book your first session.
            </p>
            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-block bg-[#F6F4EE] text-[#15201A] px-8 py-3 rounded-full text-sm font-semibold hover:bg-white transition-colors"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer id="contact" className="w-full bg-[#15201A] text-white rounded-t-[32px] pt-16 pb-12 overflow-hidden relative">
        <div className="max-w-[1200px] mx-auto px-8 space-y-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Left Brand Column (5 cols) */}
            <div className="md:col-span-5 space-y-5">
              <div className="flex items-center gap-2.5 text-white font-heading font-bold text-xl tracking-tight">
                <span className="w-2.5 h-2.5 rounded-full bg-[#23513C] shrink-0" />
                <span>Champions Club</span>
              </div>
              <p className="text-xs text-white/70 max-w-sm leading-relaxed">
                {siteSettings.tagline}
              </p>
              <div className="flex gap-3 pt-2">
                <Link
                  href="/signup"
                  className="bg-[#F6F4EE] text-[#15201A] px-5 py-2 rounded-full text-xs font-semibold hover:bg-white transition-colors"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="border border-white/30 text-white px-5 py-2 rounded-full text-xs font-semibold hover:bg-white/10 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>

            {/* Right 4 Columns (7 cols) */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
              {/* Col 1: Explore */}
              <div className="space-y-3">
                <div className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Explore
                </div>
                <div className="space-y-2 text-white/70">
                  <div>
                    <a href="#courts" className="hover:text-white transition-colors">
                      Courts
                    </a>
                  </div>
                  <div>
                    <a href="#how-it-works" className="hover:text-white transition-colors">
                      How it works
                    </a>
                  </div>
                  <div>
                    <a href="#membership" className="hover:text-white transition-colors">
                      Membership
                    </a>
                  </div>
                  <div>
                    <a href="#pro-shop" className="hover:text-white transition-colors">
                      Pro Shop
                    </a>
                  </div>
                </div>
              </div>

              {/* Col 2: Visit */}
              {(siteSettings.address || siteSettings.city) && (
                <div className="space-y-3">
                  <div className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Visit
                  </div>
                  <div className="space-y-1 text-white/70">
                    {siteSettings.address && <div>{siteSettings.address}</div>}
                    {siteSettings.city && <div>{siteSettings.city}</div>}
                  </div>
                </div>
              )}

              {/* Col 3: Hours */}
              {siteSettings.hours && (
                <div className="space-y-3">
                  <div className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Hours
                  </div>
                  <div className="space-y-1 text-white/70">
                    <div>Open daily</div>
                    <div>6:00 am to 10:00 pm</div>
                  </div>
                </div>
              )}

              {/* Col 4: Contact */}
              {(siteSettings.phone || siteSettings.email) && (
                <div className="space-y-3">
                  <div className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Contact
                  </div>
                  <div className="space-y-1 text-white/70">
                    {siteSettings.phone && <div>{siteSettings.phone}</div>}
                    {siteSettings.email && (
                      <div className="break-all">{siteSettings.email}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Divider & Copyright */}
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between text-xs text-white/50 gap-2">
            <div>© 2026 The Champions Club</div>
            <div>Tennis · Padel · Badminton</div>
          </div>
        </div>

        {/* Giant Faint Wordmark Cropped at Bottom */}
        <div
          aria-hidden="true"
          className="select-none pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 text-[clamp(80px,14vw,160px)] font-heading font-bold text-[#F6F4EE]/[0.08] tracking-[-0.05em] whitespace-nowrap leading-none"
        >
          Champions Club
        </div>
      </footer>
    </div>
  );
}
