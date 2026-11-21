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

  // Ensure member record exists for this user
  let member = await prisma.member.findUnique({
    where: { userId: user.id },
  });

  if (!member) {
    // If somehow a member record wasn't created, initialize one
    const memberCount = await prisma.member.count();
    const membershipNo = `CC-2026-${String(memberCount + 1).padStart(3, "0")}`;
    const qrToken = `QR-CC-${String(memberCount + 1).padStart(3, "0")}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    member = await prisma.member.create({
      data: {
        userId: user.id,
        membershipNo,
        qrToken,
      },
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0B3B2C] text-[#F4F1EA]">
      {/* Top Navbar */}
      <header className="h-20 border-b border-white/10 bg-[#07271D] sticky top-0 z-30 px-6 sm:px-10 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-full bg-[#C8F13A] text-[#07271D] flex items-center justify-center font-bold shadow-md transition-transform group-hover:scale-105">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display uppercase text-xl tracking-wider text-[#F4F1EA] block leading-none">
                THE CHAMPIONS CLUB
              </span>
              <span className="text-[10px] tracking-widest text-[#C8F13A] uppercase font-semibold">
                MEMBER PRIVILEGE
              </span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold tracking-wider uppercase">
            <Link
              href="/member"
              className="px-3.5 py-2 rounded-full hover:bg-white/10 text-[#F4F1EA]/80 hover:text-[#C8F13A] transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/member/book"
              className="px-3.5 py-2 rounded-full hover:bg-white/10 text-[#F4F1EA]/80 hover:text-[#C8F13A] transition-colors"
            >
              Book Court
            </Link>
            <Link
              href="/member/bookings"
              className="px-3.5 py-2 rounded-full hover:bg-white/10 text-[#F4F1EA]/80 hover:text-[#C8F13A] transition-colors"
            >
              My Bookings
            </Link>
            <Link
              href="/member/shop"
              className="px-3.5 py-2 rounded-full hover:bg-white/10 text-[#F4F1EA]/80 hover:text-[#C8F13A] transition-colors"
            >
              Pro Shop
            </Link>
            <Link
              href="/member/orders"
              className="px-3.5 py-2 rounded-full hover:bg-white/10 text-[#F4F1EA]/80 hover:text-[#C8F13A] transition-colors"
            >
              Orders
            </Link>
            <Link
              href="/member/plan"
              className="px-3.5 py-2 rounded-full hover:bg-white/10 text-[#F4F1EA]/80 hover:text-[#C8F13A] transition-colors"
            >
              Plan
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-[#F4F1EA]">{user.name}</span>
            <span className="text-[10px] font-mono text-[#C8F13A]">{member.membershipNo}</span>
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
