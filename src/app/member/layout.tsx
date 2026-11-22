import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const role = (user as { role?: string }).role || "MEMBER";
  if (role === "OWNER") {
    redirect("/admin/owner");
  }
  if (role === "STAFF") {
    redirect("/admin/members");
  }

  let member = await prisma.member.findUnique({
    where: { userId: user.id },
  });

  if (!member) {
    try {
      const memberCount = await prisma.member.count();
      const membershipNo = `CC-2026-${String(memberCount + 1).padStart(3, "0")}`;
      const qrToken = `QR-CC-${String(memberCount + 1).padStart(3, "0")}-${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      member = await prisma.member.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          membershipNo,
          qrToken,
        },
      });
    } catch {
      member = await prisma.member.findUnique({
        where: { userId: user.id },
      });
    }
  }

  if (!member) {
    redirect("/login");
  }

  const navLinks = [
    { label: "Overview", href: "/member" },
    { label: "Book Court", href: "/member/book" },
    { label: "My Bookings", href: "/member/bookings" },
    { label: "Pro Shop", href: "/member/shop" },
    { label: "Orders", href: "/member/orders" },
    { label: "Plan", href: "/member/plan" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#111111]">
      {/* Top Navbar matching landing page */}
      <header className="h-16 border-b border-[#E6E6E6] bg-white sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="font-brand font-extrabold text-[19px] tracking-tight text-[#111111] uppercase hover:opacity-85 transition-opacity"
          >
            CHAMPIONS CLUB
          </Link>

          {/* Desktop Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[#111111]">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                prefetch={false}
                href={link.href}
                className="hover:text-[#1F4A33] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Member Profile and Sign Out */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-[#111111]">{user.name}</span>
            <span className="text-[10px] font-mono text-[#6B6B6B]">{member.membershipNo}</span>
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-[1344px] mx-auto py-8 px-4 sm:px-8">
        {children}
      </main>
    </div>
  );
}
