import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { formatClubDate, formatClubTime } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function MemberPortalPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  let member = await prisma.member.findUnique({
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

  if (!member) {
    const role = (user as { role?: string }).role;
    if (role === "OWNER") {
      redirect("/admin/owner");
    }
    if (role === "STAFF") {
      redirect("/admin/members");
    }

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
        include: {
          user: true,
          memberships: {
            include: { plan: true },
            take: 1,
          },
          bookings: {
            include: { court: true },
            take: 5,
          },
          shopOrders: {
            include: { items: { include: { product: true } } },
            take: 5,
          },
        },
      });
    } catch {
      member = await prisma.member.findUnique({
        where: { userId: user.id },
        include: {
          user: true,
          memberships: {
            include: { plan: true },
            take: 1,
          },
          bookings: {
            include: { court: true },
            take: 5,
          },
          shopOrders: {
            include: { items: { include: { product: true } } },
            take: 5,
          },
        },
      });
    }
  }

  if (!member) {
    redirect("/login");
  }

  const entitlement = await resolve(member.id);
  const activeMembership = member.memberships[0];
  const isWalkIn = !entitlement.plan;

  let daysLeft = 0;
  if (activeMembership && new Date(activeMembership.endsAt) > new Date()) {
    const diffTime = new Date(activeMembership.endsAt).getTime() - Date.now();
    daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-6 text-[#111111]">
      {/* No-plan banner */}
      {isWalkIn && (
        <div className="rounded-[14px] p-5 bg-[#EFEFEF] border border-[#E6E6E6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#111111]">No active membership plan</p>
            <p className="text-xs text-[#6B6B6B] mt-0.5">
              You are currently on guest rates. Choose a tier to unlock automated member discounts.
            </p>
          </div>
          <Link
            href="/member/choose-plan"
            className="h-10 px-5 rounded-full font-semibold text-xs uppercase tracking-wider bg-[#1F4A33] text-white hover:bg-[#163826] transition-colors shrink-0 flex items-center"
          >
            Choose a plan
          </Link>
        </div>
      )}

      {/* Member pass card */}
      <div className="rounded-[16px] p-6 bg-white border border-[#E6E6E6] shadow-2xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#1F4A33] text-white">
                {entitlement.plan?.name || "Walk-in"}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold text-[#6B6B6B] bg-[#EFEFEF]">
                {isWalkIn ? "Walk-in" : `${daysLeft} days remaining`}
              </span>
            </div>

            <div>
              <h1 className="font-anton text-3xl sm:text-4xl uppercase tracking-normal text-[#111111]">
                {user.name}
              </h1>
              <p className="text-xs font-mono text-[#6B6B6B] mt-1">
                {member.membershipNo}
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-xs pt-4 border-t border-[#E6E6E6]">
              <div>
                <span className="text-[#6B6B6B] block mb-0.5 text-[11px] uppercase tracking-wider">Court</span>
                <span className="font-semibold text-[#1F4A33]">{entitlement.courtDiscountPct}% off</span>
              </div>
              <div>
                <span className="text-[#6B6B6B] block mb-0.5 text-[11px] uppercase tracking-wider">Shop</span>
                <span className="font-semibold text-[#1F4A33]">{entitlement.shopDiscountPct}% off</span>
              </div>
              <div>
                <span className="text-[#6B6B6B] block mb-0.5 text-[11px] uppercase tracking-wider">Bar</span>
                <span className="font-semibold text-[#1F4A33]">{entitlement.barDiscountPct}% off</span>
              </div>
              <div>
                <span className="text-[#6B6B6B] block mb-0.5 text-[11px] uppercase tracking-wider">Daily Bookings</span>
                <span className="font-semibold text-[#111111]">{entitlement.bookingsLeftToday} remaining today</span>
              </div>
            </div>
          </div>

          {/* QR pass link */}
          <Link
            href="/member/card"
            className="h-10 px-5 rounded-full border border-[#E6E6E6] text-xs font-semibold uppercase tracking-wider text-[#111111] hover:bg-[#EFEFEF] transition-colors shrink-0 flex items-center"
          >
            Digital Pass →
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: "/member/book", label: "Book Court", sub: "Tennis, Padel, Badminton" },
          { href: "/member/bookings", label: "My Bookings", sub: "Schedule & history" },
          { href: "/member/shop", label: "Pro Shop", sub: "Rackets, balls, gear" },
          { href: "/member/orders", label: "My Orders", sub: "Order history" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="p-5 rounded-[14px] bg-white border border-[#E6E6E6] hover:border-[#1F4A33] transition-colors shadow-2xs"
          >
            <div className="text-sm font-semibold text-[#111111]">{item.label}</div>
            <div className="text-xs text-[#6B6B6B] mt-1">{item.sub}</div>
          </Link>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent bookings */}
        <div className="rounded-[16px] p-6 bg-white border border-[#E6E6E6] space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Recent bookings</h2>
            <Link href="/member/bookings" className="text-xs font-semibold text-[#1F4A33] hover:underline">
              View all
            </Link>
          </div>

          {member.bookings.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6B6B6B]">
              No bookings yet. Ready to play?
              <div className="mt-3">
                <Link
                  href="/member/book"
                  className="inline-flex h-9 px-4 rounded-full bg-[#1F4A33] text-white text-xs font-semibold items-center hover:bg-[#163826] transition-colors"
                >
                  Book a court
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#E6E6E6]">
              {member.bookings.map((booking) => (
                <div key={booking.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-[#111111]">{booking.court.name}</div>
                    <div className="text-[#6B6B6B]">
                      {formatClubDate(booking.startsAt)} · {formatClubTime(booking.startsAt)} - {formatClubTime(booking.endsAt)}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    booking.status === "CONFIRMED"
                      ? "bg-[#EFEFEF] text-[#111111]"
                      : "bg-red-50 text-red-600"
                  }`}>
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="rounded-[16px] p-6 bg-white border border-[#E6E6E6] space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Recent orders</h2>
            <Link href="/member/orders" className="text-xs font-semibold text-[#1F4A33] hover:underline">
              View all
            </Link>
          </div>

          {member.shopOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6B6B6B]">
              No shop orders yet.
              <div className="mt-3">
                <Link
                  href="/member/shop"
                  className="inline-flex h-9 px-4 rounded-full border border-[#E6E6E6] text-[#111111] text-xs font-semibold items-center hover:bg-[#EFEFEF] transition-colors"
                >
                  Browse Pro Shop
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#E6E6E6]">
              {member.shopOrders.map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-[#111111]">
                      {order.items.length} item{order.items.length > 1 ? "s" : ""}
                    </div>
                    <div className="text-[#6B6B6B]">{formatClubDate(order.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[#111111]">₹{Number(order.totalAmount).toLocaleString("en-IN")}</div>
                    <span className="text-[10px] uppercase font-bold text-[#6B6B6B]">{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
