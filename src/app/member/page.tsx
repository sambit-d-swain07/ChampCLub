import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { formatClubDate, formatClubTime } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function MemberPortalPage() {
  console.time("[Route: /member] Total page load");
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  console.time("[Route: /member] DB fetch member & relations");
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
  console.timeEnd("[Route: /member] DB fetch member & relations");

  if (!member) {
    const role = (user as { role?: string }).role;
    if (role === "OWNER") {
      redirect("/admin/owner");
    }
    if (role === "STAFF") {
      redirect("/admin/members");
    }

    // Auto-initialize member record if not yet created
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

    if (!member) {
      redirect("/login");
    }
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
    <div className="space-y-6 text-[#15201A]">
      {/* No-plan banner */}
      {isWalkIn && (
        <div className="rounded-xl p-4 bg-white border border-[#D9D5C9] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#15201A]">No active membership plan</p>
            <p className="text-xs text-[#55605A] mt-0.5">
              You are on walk-in rates. Choose a plan to unlock up to 20% off courts, shop and bar.
            </p>
          </div>
          <Link
            href="/member/choose-plan"
            className="px-4 py-2 rounded-lg font-semibold text-xs bg-[#23513C] text-white hover:bg-[#1a3d2d] transition-colors shrink-0"
          >
            Choose a plan
          </Link>
        </div>
      )}

      {/* Member pass card */}
      <div className="rounded-xl p-6 bg-white border border-[#D9D5C9]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded text-xs font-semibold uppercase bg-[#F6F4EE] border border-[#D9D5C9] text-[#15201A]">
                {entitlement.plan?.name || "Walk-in"}
              </span>
              <span className="px-2.5 py-1 rounded text-xs font-semibold text-[#55605A]">
                {isWalkIn ? "Walk-in" : `${daysLeft} days left`}
              </span>
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#15201A]">
                {user.name}
              </h1>
              <p className="text-xs text-[#55605A] mt-0.5">
                {member.membershipNo}
              </p>
            </div>

            <div className="flex flex-wrap gap-6 text-xs pt-3 border-t border-[#D9D5C9]">
              <div>
                <span className="text-[#55605A] block mb-0.5">Court</span>
                <span className="font-semibold text-[#23513C]">{entitlement.courtDiscountPct}% off</span>
              </div>
              <div>
                <span className="text-[#55605A] block mb-0.5">Shop</span>
                <span className="font-semibold text-[#23513C]">{entitlement.shopDiscountPct}% off</span>
              </div>
              <div>
                <span className="text-[#55605A] block mb-0.5">Bar</span>
                <span className="font-semibold text-[#23513C]">{entitlement.barDiscountPct}% off</span>
              </div>
              <div>
                <span className="text-[#55605A] block mb-0.5">Today</span>
                <span className="font-semibold text-[#15201A]">{entitlement.bookingsLeftToday} bookings left</span>
              </div>
            </div>
          </div>

          {/* QR pass link */}
          <Link
            href="/member/card"
            className="px-4 py-2.5 rounded-lg border border-[#D9D5C9] text-xs font-semibold text-[#23513C] hover:bg-[#F6F4EE] transition-colors shrink-0"
          >
            View digital pass →
          </Link>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/member/book", label: "Book Court", sub: "Tennis, Padel, Badminton" },
          { href: "/member/bookings", label: "My Bookings", sub: "Schedule & history" },
          { href: "/member/shop", label: "Pro Shop", sub: "Rackets, balls, gear" },
          { href: "/member/orders", label: "My Orders", sub: "Order history" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="p-4 rounded-xl bg-white border border-[#D9D5C9] hover:border-[#23513C] transition-colors"
          >
            <div className="text-sm font-semibold text-[#15201A]">{item.label}</div>
            <div className="text-xs text-[#55605A] mt-0.5">{item.sub}</div>
          </Link>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent bookings */}
        <div className="rounded-xl p-5 bg-white border border-[#D9D5C9] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#15201A]">Recent bookings</h2>
            <Link href="/member/bookings" className="text-xs text-[#23513C] hover:underline">
              View all
            </Link>
          </div>

          {member.bookings && member.bookings.length > 0 ? (
            <div className="divide-y divide-[#D9D5C9] text-xs">
              {member.bookings.map((b) => (
                <div key={b.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#15201A]">{b.court.name}</div>
                    <div className="text-[#55605A] mt-0.5">
                      {formatClubDate(b.startsAt)} · {formatClubTime(b.startsAt)}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#F6F4EE] text-[#55605A]">
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#55605A] py-4">No bookings yet.</p>
          )}
        </div>

        {/* Recent orders */}
        <div className="rounded-xl p-5 bg-white border border-[#D9D5C9] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#15201A]">Recent orders</h2>
            <Link href="/member/orders" className="text-xs text-[#23513C] hover:underline">
              View all
            </Link>
          </div>

          {member.shopOrders && member.shopOrders.length > 0 ? (
            <div className="divide-y divide-[#D9D5C9] text-xs">
              {member.shopOrders.map((o) => (
                <div key={o.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[#15201A]">
                      {o.items.length} item{o.items.length > 1 ? "s" : ""}
                    </div>
                    <div className="text-[#55605A] mt-0.5">
                      {formatClubDate(o.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[#15201A]">
                      ₹{Number(o.totalAmount).toLocaleString("en-IN")}
                    </div>
                    <span className="text-[10px] text-[#55605A] uppercase">{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#55605A] py-4">No orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
