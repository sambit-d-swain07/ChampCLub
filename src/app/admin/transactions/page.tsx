import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveFinanceRange } from "@/lib/services/finance";
import { TransactionFilterRow } from "@/components/admin/transaction-filter-row";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { formatInrPrecise, formatClubDate, formatClubTime } from "@/lib/site-settings";
import type { LedgerSource, LedgerKind, PaymentMethod, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const SOURCE_LABELS: Record<string, string> = {
  COURT: "Courts",
  SHOP: "Pro Shop",
  BAR: "Bar & Café",
  MEMBERSHIP: "Membership",
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    source?: string;
    kind?: string;
    method?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  if (role !== "OWNER") {
    redirect("/admin/members");
  }

  const params = await searchParams;
  const { range, from, to, source, kind, method, q } = params;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const filter = resolveFinanceRange(range, from, to);

  // If query is provided, find matching members or references
  let matchingRefIds: string[] | null = null;
  if (q && q.trim()) {
    const term = q.trim();
    const members = await prisma.member.findMany({
      where: {
        OR: [
          { membershipNo: { contains: term, mode: "insensitive" } },
          { user: { name: { contains: term, mode: "insensitive" } } },
        ],
      },
      select: { id: true },
    });

    const memberIds = members.map((m) => m.id);

    const [bookings, orders, tabs, memberships] = await Promise.all([
      memberIds.length > 0 ? prisma.booking.findMany({ where: { memberId: { in: memberIds } }, select: { id: true } }) : [],
      memberIds.length > 0 ? prisma.shopOrder.findMany({ where: { memberId: { in: memberIds } }, select: { id: true } }) : [],
      memberIds.length > 0 ? prisma.tab.findMany({ where: { memberId: { in: memberIds } }, select: { id: true } }) : [],
      memberIds.length > 0 ? prisma.membership.findMany({ where: { memberId: { in: memberIds } }, select: { id: true } }) : [],
    ]);

    matchingRefIds = [
      ...bookings.map((b) => b.id),
      ...orders.map((o) => o.id),
      ...tabs.map((t) => t.id),
      ...memberships.map((m) => m.id),
    ];
  }

  // Build where clause
  const where: Prisma.LedgerEntryWhereInput = {
    createdAt: { gte: filter.start, lte: filter.end },
    ...(source && ["COURT", "SHOP", "BAR", "MEMBERSHIP"].includes(source)
      ? { source: source as LedgerSource }
      : {}),
    ...(kind && ["EARNED", "COLLECTED", "REFUNDED"].includes(kind)
      ? { kind: kind as LedgerKind }
      : {}),
    ...(method && ["CASH", "CARD", "UPI", "ONLINE"].includes(method)
      ? { method: method as PaymentMethod }
      : {}),
    ...(q && q.trim()
      ? {
          OR: [
            { refId: { contains: q.trim(), mode: "insensitive" } },
            ...(matchingRefIds && matchingRefIds.length > 0 ? [{ refId: { in: matchingRefIds } }] : []),
          ],
        }
      : {}),
  };

  // Run queries in parallel: entries, total count, and summary sums by kind
  const [entries, total, kindGroups] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.ledgerEntry.count({ where }),
    prisma.ledgerEntry.groupBy({
      by: ["kind"],
      where,
      _sum: { amount: true },
    }),
  ]);

  // Summaries
  let earnedTotal = 0;
  let collectedTotal = 0;
  let refundedTotal = 0;
  for (const g of kindGroups) {
    const amt = Number(g._sum.amount || 0);
    if (g.kind === "EARNED") earnedTotal = amt;
    else if (g.kind === "COLLECTED") collectedTotal = amt;
    else if (g.kind === "REFUNDED") refundedTotal = amt;
  }

  // Resolve member references for this page of entries
  const bookingIds = entries.filter((e) => e.refType === "BOOKING").map((e) => e.refId);
  const orderIds = entries.filter((e) => e.refType === "SHOP_ORDER").map((e) => e.refId);
  const tabIds = entries.filter((e) => e.refType === "TAB").map((e) => e.refId);
  const membershipIds = entries.filter((e) => e.refType === "MEMBERSHIP").map((e) => e.refId);

  const [bookings, orders, tabs, memberships] = await Promise.all([
    bookingIds.length > 0
      ? prisma.booking.findMany({
          where: { id: { in: bookingIds } },
          include: { member: { include: { user: true } } },
        })
      : [],
    orderIds.length > 0
      ? prisma.shopOrder.findMany({
          where: { id: { in: orderIds } },
          include: { member: { include: { user: true } } },
        })
      : [],
    tabIds.length > 0
      ? prisma.tab.findMany({
          where: { id: { in: tabIds } },
          include: { member: { include: { user: true } } },
        })
      : [],
    membershipIds.length > 0
      ? prisma.membership.findMany({
          where: { id: { in: membershipIds } },
          include: { member: { include: { user: true } } },
        })
      : [],
  ]);

  const bookingMap = new Map(bookings.map((b) => [b.id, b]));
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const tabMap = new Map(tabs.map((t) => [t.id, t]));
  const membershipMap = new Map(memberships.map((m) => [m.id, m]));

  const getMemberName = (entry: typeof entries[0]): string => {
    if (entry.refType === "BOOKING") {
      const b = bookingMap.get(entry.refId);
      return b?.member?.user?.name || b?.guestName || "Walk-in Guest";
    }
    if (entry.refType === "SHOP_ORDER") {
      const o = orderMap.get(entry.refId);
      return o?.member?.user?.name || "Walk-in Guest";
    }
    if (entry.refType === "TAB") {
      const t = tabMap.get(entry.refId);
      return t?.member?.user?.name || t?.guestName || "Walk-in Guest";
    }
    if (entry.refType === "MEMBERSHIP") {
      const m = membershipMap.get(entry.refId);
      return m?.member?.user?.name || "Member";
    }
    return "Club Member";
  };

  // CSV export URL
  const csvParams = new URLSearchParams();
  if (range) csvParams.set("range", range);
  if (from) csvParams.set("from", from);
  if (to) csvParams.set("to", to);
  if (source) csvParams.set("source", source);
  if (kind) csvParams.set("kind", kind);
  if (method) csvParams.set("method", method);
  const csvUrl = `/api/finance/export?${csvParams.toString()}`;

  return (
    <div className="space-y-4">
      {/* Back to Finance & Page Title Row */}
      <div>
        <Link
          href="/admin/owner"
          prefetch={false}
          className="text-xs text-[#23513C] hover:underline mb-1 inline-block"
        >
          &larr; Back to Finance
        </Link>
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">Transactions</h1>
          <span className="text-xs text-[#64748B]">
            {total.toLocaleString("en-IN")} entries
          </span>
        </div>
      </div>

      {/* ONE Single Filter Row */}
      <TransactionFilterRow
        currentSearch={q}
        currentRange={range}
        currentFrom={from}
        currentTo={to}
        currentSource={source}
        currentKind={kind}
        currentMethod={method}
        csvUrl={csvUrl}
      />

      {/* Summary Line above table: Earned, Collected, Refunded */}
      <div className="flex flex-wrap items-center gap-6 px-1 text-xs text-[#64748B] border-b border-[#E2E8F0] pb-2">
        <div>
          Earned: <strong className="text-[#0F172A]">{formatInrPrecise(earnedTotal)}</strong>
        </div>
        <div>
          Collected: <strong className="text-[#0F172A]">{formatInrPrecise(collectedTotal)}</strong>
        </div>
        <div>
          Refunded: <strong className="text-[#0F172A]">{formatInrPrecise(refundedTotal)}</strong>
        </div>
      </div>

      {/* Transactions Table: Sticky Header, 44px Rows, Plain Coloured Chips for Kind */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden shadow-none">
        <div className="overflow-x-auto max-h-[640px]">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-[#F8FAFC] z-10 border-b border-[#E2E8F0]">
              <tr className="h-10 text-[#64748B] font-semibold">
                <th className="px-4">Date & Time</th>
                <th className="px-4">Source</th>
                <th className="px-4">Kind</th>
                <th className="px-4">Method</th>
                <th className="px-4">Reference</th>
                <th className="px-4">Member</th>
                <th className="px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-xs text-[#64748B]">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="h-[44px] hover:bg-[#F8FAFC] transition-colors">
                    {/* Date & Time */}
                    <td className="px-4 text-[#0F172A]">
                      <span>{formatClubDate(entry.createdAt)}</span>{" "}
                      <span className="text-[#64748B] text-[11px]">{formatClubTime(entry.createdAt)}</span>
                    </td>

                    {/* Source as plain text */}
                    <td className="px-4 text-[#0F172A]">
                      {SOURCE_LABELS[entry.source] || entry.source}
                    </td>

                    {/* Kind as plain coloured text chip with NO borders */}
                    <td className="px-4">
                      {entry.kind === "COLLECTED" ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium">
                          Collected
                        </span>
                      ) : entry.kind === "EARNED" ? (
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] font-medium">
                          Earned
                        </span>
                      ) : (
                        <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded text-[11px] font-medium">
                          Refunded
                        </span>
                      )}
                    </td>

                    {/* Method */}
                    <td className="px-4 text-[#64748B]">{entry.method}</td>

                    {/* Reference */}
                    <td className="px-4 font-mono text-[11px] text-[#64748B]">
                      {entry.refType}: {entry.refId.slice(-8).toUpperCase()}
                    </td>

                    {/* Member */}
                    <td className="px-4 text-[#0F172A] font-medium truncate max-w-[160px]">
                      {getMemberName(entry)}
                    </td>

                    {/* Amount (right-aligned, tabular numbers, two decimals) */}
                    <td className="px-4 text-right font-mono font-bold text-[#0F172A]">
                      {formatInrPrecise(Number(entry.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 25 Rows / Page Server-Side Pagination Bar */}
        <div className="p-4 border-t border-[#E2E8F0]">
          <PaginationBar
            currentPage={page}
            totalItems={total}
            pageSize={PAGE_SIZE}
          />
        </div>
      </div>
    </div>
  );
}
