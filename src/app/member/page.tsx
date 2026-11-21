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
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MemberPortalPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const member = await prisma.member.findUnique({
    where: { userId: user.id },
    include: {
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

  if (!member) {
    redirect("/login");
  }

  const entitlement = await resolve(member.id, new Date());
  const activeMembership = member.memberships[0];
  const isWalkIn = entitlement.status === "WALK_IN" || entitlement.status === "EXPIRED";

  // Compute days left
  let daysLeft = 0;
  if (entitlement.endsAt) {
    const diffTime = new Date(entitlement.endsAt).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-8">
      {/* Prominent Banner if Walk-in / No active plan */}
      {isWalkIn && (
        <div className="rounded-2xl p-5 bg-gradient-to-r from-[#0E4433] to-[#155541] border border-[#C8F13A]/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-full bg-[#C8F13A] text-[#07271D] flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F4F1EA]">
                Choose a plan to unlock discounts
              </h3>
              <p className="text-xs text-[#F4F1EA]/70">
                You are currently booked under standard walk-in rates. Upgrade to Gold, Silver, or Junior to unlock up to 30% off courts, pro-shop, and cafeteria.
              </p>
            </div>
          </div>
          <Link
            href="/member/choose-plan"
            className="px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all shadow-md shrink-0 flex items-center gap-1.5"
          >
            <span>Choose a Plan</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Hero Pass Card */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#0E4433] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Trophy className="h-64 w-64 -mr-12 -mt-12 text-[#C8F13A]" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-[#C8F13A] text-[#07271D]">
                {entitlement.plan?.name || "WALK-IN"} PRIVILEGE
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#F4F1EA]">
                {isWalkIn ? "Walk-in Status" : `${daysLeft} Days Remaining`}
              </span>
            </div>

            <div>
              <h1 className="text-4xl sm:text-5xl font-display uppercase tracking-wide text-[#F4F1EA]">
                {user.name}
              </h1>
              <p className="text-xs font-mono text-[#F4F1EA]/60 mt-1">
                Pass ID: {member.membershipNo}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-[#F4F1EA]/80 pt-2 border-t border-white/10">
              <div>
                <span className="text-[10px] uppercase text-[#F4F1EA]/50 block">Court Discount</span>
                <span className="font-bold text-[#C8F13A] text-sm">{entitlement.courtDiscountPct}% OFF</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#F4F1EA]/50 block">Pro Shop Discount</span>
                <span className="font-bold text-[#C8F13A] text-sm">{entitlement.shopDiscountPct}% OFF</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#F4F1EA]/50 block">Bar & Cafe</span>
                <span className="font-bold text-[#C8F13A] text-sm">{entitlement.barDiscountPct}% OFF</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-[#F4F1EA]/50 block">Daily Quota</span>
                <span className="font-bold text-[#F4F1EA] text-sm">{entitlement.bookingsLeftToday} slots left</span>
              </div>
            </div>
          </div>

          {/* Digital QR Pass */}
          <Link
            href="/member/card"
            className="bg-[#F4F1EA] text-[#07271D] p-4 rounded-2xl shadow-xl flex flex-col items-center gap-2 self-center md:self-end hover:scale-105 transition-transform"
          >
            <QrCode className="h-20 w-20 text-[#07271D]" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#07271D]/70 uppercase">
              {member.qrToken.slice(0, 14)}
            </span>
            <span className="text-[10px] font-bold text-[#0B3B2C] hover:underline">
              Turnstile Digital Pass →
            </span>
          </Link>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/member/book"
          className="p-5 rounded-2xl bg-[#07271D] border border-white/10 hover:border-[#C8F13A]/50 transition-all flex flex-col justify-between group"
        >
          <Calendar className="h-6 w-6 text-[#C8F13A] mb-3 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-sm font-bold text-[#F4F1EA]">Book Court</div>
            <div className="text-[11px] text-[#F4F1EA]/60">Reserve tennis, padel & badminton</div>
          </div>
        </Link>

        <Link
          href="/member/bookings"
          className="p-5 rounded-2xl bg-[#07271D] border border-white/10 hover:border-[#C8F13A]/50 transition-all flex flex-col justify-between group"
        >
          <Clock className="h-6 w-6 text-[#6FB3E0] mb-3 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-sm font-bold text-[#F4F1EA]">My Bookings</div>
            <div className="text-[11px] text-[#F4F1EA]/60">View schedule and cancellations</div>
          </div>
        </Link>

        <Link
          href="/member/shop"
          className="p-5 rounded-2xl bg-[#07271D] border border-white/10 hover:border-[#C8F13A]/50 transition-all flex flex-col justify-between group"
        >
          <ShoppingBag className="h-6 w-6 text-[#C8F13A] mb-3 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-sm font-bold text-[#F4F1EA]">Pro Shop</div>
            <div className="text-[11px] text-[#F4F1EA]/60">Rackets, balls & equipment</div>
          </div>
        </Link>

        <Link
          href="/member/orders"
          className="p-5 rounded-2xl bg-[#07271D] border border-white/10 hover:border-[#C8F13A]/50 transition-all flex flex-col justify-between group"
        >
          <Sparkles className="h-6 w-6 text-[#F4F1EA] mb-3 group-hover:scale-110 transition-transform" />
          <div>
            <div className="text-sm font-bold text-[#F4F1EA]">My Orders</div>
            <div className="text-[11px] text-[#F4F1EA]/60">Order history & fulfillment</div>
          </div>
        </Link>
      </div>

      {/* Two-Column Details: Upcoming Bookings & Recent Orders */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bookings Card */}
        <div className="rounded-3xl p-6 bg-[#0E4433] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display uppercase tracking-wider text-[#F4F1EA]">
              UPCOMING COURT RESERVATIONS
            </h3>
            <Link href="/member/bookings" className="text-xs font-semibold text-[#C8F13A] hover:underline">
              Manage all →
            </Link>
          </div>

          {member.bookings && member.bookings.length > 0 ? (
            <div className="divide-y divide-white/10 text-xs">
              {member.bookings.map((b) => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#F4F1EA]">{b.court.name}</div>
                    <div className="text-[11px] text-[#F4F1EA]/60">
                      {new Date(b.startsAt).toLocaleDateString()} at{" "}
                      {new Date(b.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-white/10 text-[#C8F13A]">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-[#F4F1EA]/50">No court reservations scheduled.</p>
              <Link
                href="/member/book"
                className="inline-block px-4 py-2 rounded-full text-xs font-bold bg-[#C8F13A] text-[#07271D]"
              >
                Book a Court
              </Link>
            </div>
          )}
        </div>

        {/* Recent Orders Card */}
        <div className="rounded-3xl p-6 bg-[#0E4433] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display uppercase tracking-wider text-[#F4F1EA]">
              RECENT PRO SHOP ORDERS
            </h3>
            <Link href="/member/orders" className="text-xs font-semibold text-[#C8F13A] hover:underline">
              View all →
            </Link>
          </div>

          {member.shopOrders && member.shopOrders.length > 0 ? (
            <div className="divide-y divide-white/10 text-xs">
              {member.shopOrders.map((o) => (
                <div key={o.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#F4F1EA]">
                      {o.items.length} item{o.items.length > 1 ? "s" : ""} • {o.fulfilment}
                    </div>
                    <div className="text-[11px] text-[#F4F1EA]/60">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#C8F13A]">
                      ₹{Number(o.totalAmount).toLocaleString("en-IN")}
                    </div>
                    <span className="text-[10px] uppercase text-[#F4F1EA]/60">{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-[#F4F1EA]/50">No shop orders yet.</p>
              <Link
                href="/member/shop"
                className="inline-block px-4 py-2 rounded-full text-xs font-bold bg-[#C8F13A] text-[#07271D]"
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
