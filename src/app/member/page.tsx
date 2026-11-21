import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import {
  Trophy,
  QrCode,
  Calendar,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MemberPortalPage() {
  console.time("[Route: /member] Total page load");
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  console.time("[Route: /member] DB fetch member & relations");
  const member = await prisma.member.findUnique({
    where: { userId: user.id },
    include: {
      user: true,
      memberships: {
        include: { plan: true },
        orderBy: { endsAt: "desc" },
        take: 1,
      },
      bookings: {
        include: { court: true },
        orderBy: { startsAt: "desc" },
        take: 5,
      },
      shopOrders: {
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
  console.timeEnd("[Route: /member] DB fetch member & relations");

  if (!member) {
    redirect("/login");
  }

  console.time("[Route: /member] resolve entitlement");
  const entitlement = await resolve(member.id, new Date(), member);
  console.timeEnd("[Route: /member] resolve entitlement");
  console.timeEnd("[Route: /member] Total page load");
  const isWalkIn = entitlement.status === "WALK_IN" || entitlement.status === "EXPIRED";

  // Compute days left
  let daysLeft = 0;
  if (entitlement.endsAt) {
    const diffTime = new Date(entitlement.endsAt).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-8 text-[#1B1B1B]">
      {/* Prominent Banner if Walk-in / No active plan */}
      {isWalkIn && (
        <div className="rounded-[24px] p-5 bg-white border border-[#5F9E4A]/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-full bg-[#E8883A] text-[#1B1B1B] flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1B1B1B]">
                Choose a plan to unlock member discounts
              </h3>
              <p className="text-xs text-gray-600">
                You are currently booked under standard walk-in rates. Upgrade to Gold, Silver, or Junior to unlock up to 20% off courts, pro-shop, and cafe.
              </p>
            </div>
          </div>
          <Link
            href="/member/choose-plan"
            className="px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider bg-[#1B1B1B] text-[#F6F5E1] hover:bg-black transition-all shadow-md shrink-0 flex items-center gap-1.5"
          >
            <span>Choose a Plan</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Hero Pass Card */}
      <div className="rounded-[28px] p-6 sm:p-8 bg-white border border-[#1B1B1B]/15 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Trophy className="h-64 w-64 -mr-12 -mt-12 text-[#1B1B1B]" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-[#1B1B1B] text-[#F6F5E1]">
                {entitlement.plan?.name || "WALK-IN"} PRIVILEGE
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#EDECCF] text-[#1B1B1B]">
                {isWalkIn ? "Walk-in Status" : `${daysLeft} Days Remaining`}
              </span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#1B1B1B]">
                {user.name}
              </h1>
              <p className="text-xs font-mono text-gray-500 mt-1">
                Pass ID: {member.membershipNo}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-[#1B1B1B]/80 pt-2 border-t border-[#1B1B1B]/10">
              <div>
                <span className="text-[10px] uppercase text-gray-400 block">Court Discount</span>
                <span className="font-bold text-[#5F9E4A] text-sm">{entitlement.courtDiscountPct}% OFF</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-gray-400 block">Pro Shop Discount</span>
                <span className="font-bold text-[#5F9E4A] text-sm">{entitlement.shopDiscountPct}% OFF</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-gray-400 block">Bar & Cafe</span>
                <span className="font-bold text-[#5F9E4A] text-sm">{entitlement.barDiscountPct}% OFF</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-gray-400 block">Daily Quota</span>
                <span className="font-bold text-[#1B1B1B] text-sm">{entitlement.bookingsLeftToday} slots left</span>
              </div>
            </div>
          </div>

          {/* Digital QR Pass */}
          <Link
            href="/member/card"
            className="bg-[#F6F5E1] text-[#1B1B1B] p-4 rounded-2xl border border-[#1B1B1B]/15 shadow-sm flex flex-col items-center gap-2 self-center md:self-end hover:scale-105 transition-transform"
          >
            <QrCode className="h-20 w-20 text-[#1B1B1B]" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#1B1B1B]/70 uppercase">
              {member.qrToken.slice(0, 14)}
            </span>
            <span className="text-[10px] font-bold text-[#5F9E4A] hover:underline">
              Turnstile Digital Pass →
            </span>
          </Link>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/member/book"
          className="p-5 rounded-2xl bg-white border border-[#1B1B1B]/15 hover:border-[#5F9E4A] transition-all flex flex-col justify-between group shadow-2xs"
        >
          <Calendar className="h-6 w-6 text-[#5F9E4A] mb-3 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-sm font-bold text-[#1B1B1B]">Book Court</div>
            <div className="text-[11px] text-gray-500">Reserve tennis, padel & badminton</div>
          </div>
        </Link>

        <Link
          href="/member/bookings"
          className="p-5 rounded-2xl bg-white border border-[#1B1B1B]/15 hover:border-[#5F9E4A] transition-all flex flex-col justify-between group shadow-2xs"
        >
          <Clock className="h-6 w-6 text-[#E8883A] mb-3 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-sm font-bold text-[#1B1B1B]">My Bookings</div>
            <div className="text-[11px] text-gray-500">View schedule and cancellations</div>
          </div>
        </Link>

        <Link
          href="/member/shop"
          className="p-5 rounded-2xl bg-white border border-[#1B1B1B]/15 hover:border-[#5F9E4A] transition-all flex flex-col justify-between group shadow-2xs"
        >
          <ShoppingBag className="h-6 w-6 text-[#5F9E4A] mb-3 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-sm font-bold text-[#1B1B1B]">Pro Shop</div>
            <div className="text-[11px] text-gray-500">Rackets, balls & equipment</div>
          </div>
        </Link>

        <Link
          href="/member/orders"
          className="p-5 rounded-2xl bg-white border border-[#1B1B1B]/15 hover:border-[#5F9E4A] transition-all flex flex-col justify-between group shadow-2xs"
        >
          <Sparkles className="h-6 w-6 text-[#E8883A] mb-3 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-sm font-bold text-[#1B1B1B]">My Orders</div>
            <div className="text-[11px] text-gray-500">Order history & fulfillment</div>
          </div>
        </Link>
      </div>

      {/* Two-Column Details: Upcoming Bookings & Recent Orders (All Database Records) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bookings Card */}
        <div className="rounded-[28px] p-6 bg-white border border-[#1B1B1B]/15 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold tracking-tight text-[#1B1B1B]">
              UPCOMING COURT RESERVATIONS
            </h3>
            <Link href="/member/bookings" className="text-xs font-semibold text-[#5F9E4A] hover:underline">
              Manage all →
            </Link>
          </div>

          {member.bookings && member.bookings.length > 0 ? (
            <div className="divide-y divide-[#1B1B1B]/10 text-xs">
              {member.bookings.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#1B1B1B]">{b.court.name}</div>
                    <div className="text-[11px] text-gray-500">
                      {new Date(b.startsAt).toLocaleDateString()} at{" "}
                      {new Date(b.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#EDECCF] text-[#1B1B1B]">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-gray-500">No court reservations scheduled.</p>
              <Link
                href="/member/book"
                className="inline-block px-4 py-2 rounded-full text-xs font-bold bg-[#1B1B1B] text-[#F6F5E1]"
              >
                Book a Court
              </Link>
            </div>
          )}
        </div>

        {/* Recent Orders Card */}
        <div className="rounded-[28px] p-6 bg-white border border-[#1B1B1B]/15 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold tracking-tight text-[#1B1B1B]">
              RECENT PRO SHOP ORDERS
            </h3>
            <Link href="/member/orders" className="text-xs font-semibold text-[#5F9E4A] hover:underline">
              View all →
            </Link>
          </div>

          {member.shopOrders && member.shopOrders.length > 0 ? (
            <div className="divide-y divide-[#1B1B1B]/10 text-xs">
              {member.shopOrders.map((o) => (
                <div key={o.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#1B1B1B]">
                      {o.items.length} item{o.items.length > 1 ? "s" : ""} • {o.fulfilment}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#5F9E4A]">
                      ₹{Number(o.totalAmount).toLocaleString("en-IN")}
                    </div>
                    <span className="text-[10px] uppercase text-gray-400">{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-gray-500">No shop orders yet.</p>
              <Link
                href="/member/shop"
                className="inline-block px-4 py-2 rounded-full text-xs font-bold bg-[#1B1B1B] text-[#F6F5E1]"
              >
                Browse Pro Shop
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
