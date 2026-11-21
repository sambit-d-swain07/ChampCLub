import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Trophy, Calendar, ShoppingBag, CreditCard, LayoutDashboard, Clock } from "lucide-react";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Security: Unauthenticated visitor hitting /member must be redirected to /login
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

  // Ensure member record exists for this member user
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F5E1] text-[#1B1B1B]">
      {/* Top Navbar */}
      <header className="h-18 border-b border-[#1B1B1B]/15 bg-[#F6F5E1]/90 backdrop-blur-md sticky top-0 z-30 px-6 sm:px-10 flex items-center justify-between">
        <div className="flex items-center gap-8">
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
                MEMBER PRIVILEGE
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs font-medium text-[#1B1B1B]">
            <Link
              prefetch={false}
              href="/member"
              className="px-3.5 py-1.5 rounded-full border border-[#1B1B1B]/20 hover:border-[#1B1B1B] hover:bg-white/60 transition-all"
            >
              Overview
            </Link>
            <Link
              prefetch={false}
              href="/member/book"
              className="px-3.5 py-1.5 rounded-full border border-[#1B1B1B]/20 hover:border-[#1B1B1B] hover:bg-white/60 transition-all"
            >
              Book Court
            </Link>
            <Link
              prefetch={false}
              href="/member/bookings"
              className="px-3.5 py-1.5 rounded-full border border-[#1B1B1B]/20 hover:border-[#1B1B1B] hover:bg-white/60 transition-all"
            >
              My Bookings
            </Link>
            <Link
              prefetch={false}
              href="/member/shop"
              className="px-3.5 py-1.5 rounded-full border border-[#1B1B1B]/20 hover:border-[#1B1B1B] hover:bg-white/60 transition-all"
            >
              Pro Shop
            </Link>
            <Link
              prefetch={false}
              href="/member/orders"
              className="px-3.5 py-1.5 rounded-full border border-[#1B1B1B]/20 hover:border-[#1B1B1B] hover:bg-white/60 transition-all"
            >
              Orders
            </Link>
            <Link
              prefetch={false}
              href="/member/plan"
              className="px-3.5 py-1.5 rounded-full border border-[#1B1B1B]/20 hover:border-[#1B1B1B] hover:bg-white/60 transition-all"
            >
              Plan
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-[#1B1B1B]">{user.name}</span>
            <span className="text-[10px] font-mono text-[#5F9E4A] font-semibold">{member.membershipNo}</span>
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-8">
        {children}
      </main>
    </div>
  );
}
