import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveFinanceRange } from "@/lib/services/finance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download } from "lucide-react";
import type { LedgerSource, LedgerKind, PaymentMethod, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const SOURCE_LABELS: Record<string, string> = {
  COURT: "Courts",
  SHOP: "Pro Shop",
  BAR: "Bar & Café",
  MEMBERSHIP: "Membership",
};

const KIND_COLORS: Record<string, string> = {
  EARNED: "border-blue-500 text-blue-700",
  COLLECTED: "border-emerald-500 text-emerald-700",
  REFUNDED: "border-rose-500 text-rose-700",
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  ONLINE: "Online",
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
    page?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  if (role !== "OWNER") {
    redirect("/admin/members");
  }

  const params = await searchParams;
  const { range, from, to, source, kind, method } = params;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const filter = resolveFinanceRange(range, from, to);

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
  };

  const [entries, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.ledgerEntry.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Build URL helper for filter links
  function filterUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { range, from, to, source, kind, method, page: "1", ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    return `/admin/transactions?${p.toString()}`;
  }

  function pageUrl(p: number) {
    return filterUrl({ page: String(p) });
  }

  // CSV export URL with current filters
  const csvParams = new URLSearchParams();
  if (range) csvParams.set("range", range);
  if (from) csvParams.set("from", from);
  if (to) csvParams.set("to", to);
  if (source) csvParams.set("source", source);
  if (kind) csvParams.set("kind", kind);
  if (method) csvParams.set("method", method);
  const csvUrl = `/api/finance/export?${csvParams.toString()}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/owner">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Finance
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Transaction Ledger</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filter.label} · {total.toLocaleString("en-IN")} entries
            </p>
          </div>
        </div>
        <a href={csvUrl} download>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </a>
      </div>

      {/* Filters */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filters</CardTitle>
          <CardDescription className="text-xs">Click to filter. Filters are reflected in the URL for sharing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Date Range */}
          <div>
            <div className="text-[11px] text-muted-foreground font-medium uppercase mb-1.5">Date Range</div>
            <div className="flex flex-wrap gap-2">
              {(["today", "week", "month"] as const).map((r) => (
                <Link key={r} href={filterUrl({ range: r, from: undefined, to: undefined })}>
                  <Badge
                    variant={(!range && r === "month") || range === r ? "default" : "outline"}
                    className="cursor-pointer text-[11px]"
                  >
                    {r === "today" ? "Today" : r === "week" ? "This Week" : "This Month"}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <div className="text-[11px] text-muted-foreground font-medium uppercase mb-1.5">Source</div>
            <div className="flex flex-wrap gap-2">
              <Link href={filterUrl({ source: undefined })}>
                <Badge variant={!source ? "default" : "outline"} className="cursor-pointer text-[11px]">All</Badge>
              </Link>
              {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                <Link key={k} href={filterUrl({ source: k })}>
                  <Badge variant={source === k ? "default" : "outline"} className="cursor-pointer text-[11px]">{v}</Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Kind */}
          <div>
            <div className="text-[11px] text-muted-foreground font-medium uppercase mb-1.5">Type</div>
            <div className="flex flex-wrap gap-2">
              <Link href={filterUrl({ kind: undefined })}>
                <Badge variant={!kind ? "default" : "outline"} className="cursor-pointer text-[11px]">All</Badge>
              </Link>
              {["EARNED", "COLLECTED", "REFUNDED"].map((k) => (
                <Link key={k} href={filterUrl({ kind: k })}>
                  <Badge variant={kind === k ? "default" : "outline"} className="cursor-pointer text-[11px]">{k}</Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <div className="text-[11px] text-muted-foreground font-medium uppercase mb-1.5">Payment Method</div>
            <div className="flex flex-wrap gap-2">
              <Link href={filterUrl({ method: undefined })}>
                <Badge variant={!method ? "default" : "outline"} className="cursor-pointer text-[11px]">All</Badge>
              </Link>
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <Link key={k} href={filterUrl({ method: k })}>
                  <Badge variant={method === k ? "default" : "outline"} className="cursor-pointer text-[11px]">{v}</Badge>
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-xs">
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              No transactions found for the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date & Time</TableHead>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs">Kind</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Ref</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const dt = new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }).format(e.createdAt);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{dt}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {SOURCE_LABELS[e.source] || e.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className={`text-[10px] ${KIND_COLORS[e.kind] || ""}`}>
                          {e.kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {METHOD_LABELS[e.method] || e.method}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.refType}/{e.refId.slice(-6)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-right">
                        ₹{Number(e.amount).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageUrl(page - 1)}>
                <Button variant="outline" size="sm" className="text-xs">Previous</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageUrl(page + 1)}>
                <Button variant="outline" size="sm" className="text-xs">Next</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
