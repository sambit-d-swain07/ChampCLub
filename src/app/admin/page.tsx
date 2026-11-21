import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, CalendarCheck, IndianRupee, AlertTriangle, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  // STAFF is blocked from the Owner Dashboard (financial metrics & revenue overview)
  if (role !== "OWNER") {
    redirect("/admin/members");
  }

  const metrics = await getDashboardMetrics();

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Club Overview & Operations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live pulse across court bookings, pro shop sales, Champions bar tabs, and memberships.
        </p>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Active Members</CardTitle>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.memberCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Across Gold, Silver & Junior plans</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">30-Day Revenue</CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{metrics.totalRevenue.toLocaleString("en-IN")}</div>
            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1 font-medium">
              <ArrowUpRight className="h-3 w-3" /> All modules aggregated
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Recent Bookings</CardTitle>
            <CalendarCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeBookingsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Tennis, Padel & Badminton</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Expiring in 7 Days</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.expiringMemberships.length}</div>
            <p className="text-xs text-amber-600 mt-1 font-medium">Critical renewal alert window</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart & Expiring Memberships */}
      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue Distribution (Last 30 Days)</CardTitle>
            <CardDescription className="text-xs">
              Live ledger collections by club division: Courts, Pro Shop, Bar, Memberships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={metrics.revenueChartData} />
          </CardContent>
        </Card>

        <Card className="md:col-span-3 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Expiring in 7 Days
              </CardTitle>
              <CardDescription className="text-xs">
                Members needing immediate renewal notice within 7 days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics.expiringMemberships.map((m) => {
                const daysLeft = Math.ceil(
                  (new Date(m.endsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div>
                      <div className="text-xs font-semibold">{m.member.user?.name || `Member ${m.member.membershipNo}`}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {m.member.membershipNo} • <Badge variant="outline" className="text-[10px]">{m.plan.name}</Badge>
                      </div>
                    </div>
                    <Badge variant="destructive" className="text-[10px]">
                      {daysLeft}d remaining
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </div>

          <div className="p-4 bg-muted/40 border-t rounded-b-lg">
            <div className="text-xs font-medium text-foreground mb-1">Low Stock Watch</div>
            <div className="flex flex-wrap gap-1.5">
              {metrics.lowStockAlerts.map((alert) => (
                <span
                  key={alert.id}
                  className="text-[10px] bg-background border px-2 py-0.5 rounded text-muted-foreground"
                >
                  {alert.name} ({alert.stockQty} left)
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bookings & Ledger Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Court Schedule</CardTitle>
            <CardDescription className="text-xs">Latest bookings across tennis, padel and badminton courts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Court</TableHead>
                  <TableHead className="text-xs">Member</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentBookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-xs font-medium">{b.court.name.split(" (")[0]}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.member?.user?.name || b.guestName || "Guest"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-right">
                      ₹{(Number(b.priceSnapshot) - Number(b.discountSnapshot)).toFixed(0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recent Ledger Entries */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Live Financial Ledger</CardTitle>
            <CardDescription className="text-xs">Audited transactions recorded directly to the ledger.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Source</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Kind</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentLedger.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs font-semibold">
                      <Badge
                        variant="outline"
                        className={
                          l.source === "COURT"
                            ? "border-blue-500 text-blue-700"
                            : l.source === "SHOP"
                              ? "border-emerald-500 text-emerald-700"
                              : l.source === "BAR"
                                ? "border-amber-500 text-amber-700"
                                : "border-purple-500 text-purple-700"
                        }
                      >
                        {l.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.method}</TableCell>
                    <TableCell className="text-xs">{l.kind}</TableCell>
                    <TableCell className="text-xs font-semibold text-right">
                      ₹{Number(l.amount).toLocaleString("en-IN")}
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
