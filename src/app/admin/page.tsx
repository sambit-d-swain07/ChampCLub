import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatInrPrecise } from "@/lib/site-settings";

// Lazy-load Recharts bundle to keep initial page payload tiny
const RevenueChart = nextDynamic(
  () => import("@/components/dashboard/revenue-chart").then((mod) => mod.RevenueChart),
  {
    loading: () => (
      <div className="h-[280px] w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse bg-muted/20 rounded-lg">
        Loading revenue distribution chart...
      </div>
    ),
  }
);

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  // STAFF is blocked from the Owner Dashboard
  if (role !== "OWNER") {
    redirect("/admin/members");
  }

  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">Club Overview & Operations</h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Live pulse across court bookings, pro shop sales, Champions bar tabs, and memberships.
        </p>
      </div>

      {/* Top 3 KPI Cards - Rebalanced 3-column grid without Expiring in 7 Days */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-none border border-[#E2E8F0] bg-white">
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Active Members
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl font-bold text-[#0F172A]">{metrics.memberCount}</div>
            <p className="text-xs text-[#64748B] mt-0.5">Across Gold, Silver & Junior plans</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-[#E2E8F0] bg-white">
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              30-Day Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl font-bold text-[#0F172A]">{formatInrPrecise(metrics.totalRevenue)}</div>
            <p className="text-xs text-[#64748B] mt-0.5">All operating departments combined</p>
          </CardContent>
        </Card>

        <Card className="shadow-none border border-[#E2E8F0] bg-white">
          <CardHeader className="pb-1 pt-4 px-5">
            <CardTitle className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="text-2xl font-bold text-[#0F172A]">{metrics.activeBookingsCount}</div>
            <p className="text-xs text-[#64748B] mt-0.5">Tennis, Padel & Badminton sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart & Dedicated Low Stock Watch Card */}
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-none border border-[#E2E8F0] bg-white">
          <CardHeader className="px-5 pt-4 pb-2">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">Revenue Distribution (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <RevenueChart data={metrics.revenueChartData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-none border border-[#E2E8F0] bg-white flex flex-col justify-between">
          <div>
            <CardHeader className="px-5 pt-4 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#0F172A]">Low Stock Watch</CardTitle>
              <Link href="/admin/inventory" prefetch={false} className="text-xs font-medium text-[#23513C] hover:underline">
                Manage Inventory
              </Link>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {metrics.lowStockAlerts.length === 0 ? (
                <div className="text-xs text-[#64748B] py-6 text-center">
                  All inventory items are currently above their reorder thresholds.
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {metrics.lowStockAlerts.slice(0, 6).map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                      <div>
                        <div className="text-xs font-semibold text-[#0F172A]">{item.name}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {item.type} • Reorder level: {item.reorderLevel}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {item.stockQty} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
          <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] rounded-b-lg flex items-center justify-between">
            <span className="text-xs text-[#64748B]">Restock actions and history</span>
            <Link href="/admin/inventory" prefetch={false} className="text-xs font-semibold text-[#23513C] hover:underline">
              Open Inventory &rarr;
            </Link>
          </div>
        </Card>
      </div>

      {/* Bookings & Ledger Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="shadow-none border border-[#E2E8F0] bg-white">
          <CardHeader className="px-5 pt-4 pb-2">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">Recent Court Schedule</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0]">
                  <TableHead className="text-xs text-[#64748B]">Court</TableHead>
                  <TableHead className="text-xs text-[#64748B]">Member</TableHead>
                  <TableHead className="text-xs text-[#64748B]">Status</TableHead>
                  <TableHead className="text-xs text-[#64748B] text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentBookings.map((b) => (
                  <TableRow key={b.id} className="border-[#F1F5F9]">
                    <TableCell className="text-xs font-medium text-[#0F172A]">{b.court.name.split(" (")[0]}</TableCell>
                    <TableCell className="text-xs text-[#64748B]">
                      {b.member?.user?.name || b.guestName || "Guest"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-right text-[#0F172A]">
                      {formatInrPrecise(Number(b.priceSnapshot) - Number(b.discountSnapshot))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Ledger Entries */}
        <Card className="shadow-none border border-[#E2E8F0] bg-white">
          <CardHeader className="px-5 pt-4 pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">Live Financial Ledger</CardTitle>
            <Link href="/admin/transactions" prefetch={false} className="text-xs font-medium text-[#23513C] hover:underline">
              All Transactions
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0]">
                  <TableHead className="text-xs text-[#64748B]">Source</TableHead>
                  <TableHead className="text-xs text-[#64748B]">Method</TableHead>
                  <TableHead className="text-xs text-[#64748B]">Kind</TableHead>
                  <TableHead className="text-xs text-[#64748B] text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentLedger.map((l) => (
                  <TableRow key={l.id} className="border-[#F1F5F9]">
                    <TableCell className="text-xs font-medium text-[#0F172A]">
                      {l.source}
                    </TableCell>
                    <TableCell className="text-xs text-[#64748B]">{l.method}</TableCell>
                    <TableCell className="text-xs">
                      <span className={
                        l.kind === "COLLECTED" ? "text-emerald-700 font-medium" :
                        l.kind === "EARNED" ? "text-blue-700 font-medium" :
                        "text-red-700 font-medium"
                      }>
                        {l.kind}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-right text-[#0F172A]">
                      {formatInrPrecise(Number(l.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
