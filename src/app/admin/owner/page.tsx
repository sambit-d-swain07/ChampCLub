import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { resolveFinanceRange, getOwnerFinancials } from "@/lib/services/finance";
import { FinanceFilterBar } from "@/components/admin/finance-filter-bar";
import { FinanceCharts } from "@/components/admin/finance-charts";
import { ExpenseStatusToggle } from "@/components/admin/expense-status-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  RotateCcw,
  Receipt,
  Scale,
  ArrowRight,
  ExternalLink,
  Users,
  Wine,
  AlertTriangle,
  CalendarClock,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  // Strict role enforcement: OWNER only
  if (role !== "OWNER") {
    redirect("/admin/members");
  }

  const { range, from, to } = await searchParams;
  const filter = resolveFinanceRange(range, from, to);
  const data = await getOwnerFinancials(filter);

  const { cards, charts, lists } = data;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Executive Financial Dashboard</h1>
            <Badge className="bg-emerald-600 text-white text-[10px]">OWNER PRIVILEGE</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time ledger audit, revenue realization, operational expenditure, and club capacity utilisation.
          </p>
        </div>

        <Link href="/admin/expenses">
          <Button variant="outline" size="sm" className="text-xs gap-1.5">
            <Receipt className="h-3.5 w-3.5" />
            Manage Expenses
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <FinanceFilterBar currentRange={filter.rangeType} from={from} to={to} />

      {/* KPI Cards: 6 Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* 1. Earned */}
        <Card className="shadow-xs border-l-4 border-l-blue-600">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Earned Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-black text-foreground">
              ₹{cards.earned.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Accrued from all served orders & bookings</p>
          </CardContent>
        </Card>

        {/* 2. Collected */}
        <Card className="shadow-xs border-l-4 border-l-emerald-600">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Collected Cash</CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-black text-foreground">
              ₹{cards.collected.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-emerald-700 mt-0.5 font-medium">Cash, UPI, Card in bank</p>
          </CardContent>
        </Card>

        {/* 3. Outstanding */}
        <Card className={`shadow-xs border-l-4 ${cards.outstanding > 0 ? "border-l-amber-500 bg-amber-50/20" : "border-l-zinc-300"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Outstanding</CardTitle>
            <AlertCircle className={`h-4 w-4 ${cards.outstanding > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-xl font-black ${cards.outstanding > 0 ? "text-amber-700" : "text-foreground"}`}>
              ₹{cards.outstanding.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {cards.outstanding > 0 ? "Unpaid bar tabs & active tabs" : "All recognized revenue collected"}
            </p>
          </CardContent>
        </Card>

        {/* 4. Refunded */}
        <Card className="shadow-xs border-l-4 border-l-rose-500">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Refunded</CardTitle>
            <RotateCcw className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-black text-foreground">
              ₹{cards.refunded.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Shop returns & cancellations</p>
          </CardContent>
        </Card>

        {/* 5. Expenses */}
        <Card className="shadow-xs border-l-4 border-l-purple-600">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Club Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-black text-foreground">
              ₹{cards.expenses.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Procurement, payroll, repairs</p>
          </CardContent>
        </Card>

        {/* 6. Net Profit */}
        <Card className={`shadow-xs border-l-4 ${cards.net >= 0 ? "border-l-teal-600 bg-teal-50/15" : "border-l-red-600 bg-red-50/15"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
            <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Net Operating Cash</CardTitle>
            <Scale className={`h-4 w-4 ${cards.net >= 0 ? "text-teal-600" : "text-red-600"}`} />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-xl font-black ${cards.net >= 0 ? "text-teal-800" : "text-red-700"}`}>
              ₹{cards.net.toLocaleString("en-IN")}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Collected minus expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <FinanceCharts
        revenueOverTime={charts.revenueOverTime}
        paymentMethodBreakdown={charts.paymentMethodBreakdown}
        topProducts={charts.topProducts}
        courtUtilisation={charts.courtUtilisation}
      />

      {/* 5 Lists Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* List 1: Open Tabs */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Wine className="h-4 w-4 text-amber-600" />
                Active Open Tabs ({lists.openTabs.length})
              </CardTitle>
              <Link href="/admin/bar" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                Go to Bar <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription className="text-xs">
              Tables and members with outstanding unpaid order balances.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {lists.openTabs.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                All bar tabs settled. No uncollected balance.
              </div>
            ) : (
              <div className="divide-y text-xs">
                {lists.openTabs.map((t) => (
                  <div key={t.id} className="p-3.5 flex items-center justify-between hover:bg-muted/40">
                    <div>
                      <div className="font-semibold text-foreground">{t.tableName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {t.memberName ? `Member: ${t.memberName}` : "Guest Tab"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-700">₹{t.balance.toLocaleString("en-IN")}</div>
                      <div className="text-[10px] text-muted-foreground">unpaid balance</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* List 2: Expenses Payable */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-purple-600" />
                Expenses Payable ({lists.expensesPayable.length})
              </CardTitle>
              <Link href="/admin/expenses" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                All Expenses <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription className="text-xs">
              Pending vendor disbursements and operational liabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {lists.expensesPayable.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                All logged expenses are marked as paid.
              </div>
            ) : (
              <div className="divide-y text-xs">
                {lists.expensesPayable.map((exp) => (
                  <div key={exp.id} className="p-3.5 flex items-center justify-between hover:bg-muted/40">
                    <div>
                      <div className="font-semibold text-foreground">{exp.vendor}</div>
                      <div className="text-[11px] text-muted-foreground">{exp.category}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">₹{exp.amountNum.toLocaleString("en-IN")}</span>
                      <ExpenseStatusToggle expenseId={exp.id} isPaid={exp.isPaid} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* List 3: Low Stock Alerts */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Low Stock Alert ({lists.lowStock.length})
              </CardTitle>
              <Link href="/admin/shop" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                Restock POS <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription className="text-xs">
              Items at or below minimum operating reorder threshold.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {lists.lowStock.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Inventory healthy across shop and cafeteria.
              </div>
            ) : (
              <div className="divide-y text-xs">
                {lists.lowStock.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-muted/40">
                    <div>
                      <div className="font-semibold text-foreground">{item.name}</div>
                      <Badge variant="outline" className="text-[10px] py-0 px-1 mt-0.5">
                        {item.type}
                      </Badge>
                    </div>
                    <Badge variant="destructive" className="text-[10px] font-bold">
                      {item.stockQty} remaining
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* List 4: Expiring Memberships */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-amber-500" />
                Expiring in 7 Days ({lists.expiringMemberships.length})
              </CardTitle>
              <Link href="/admin/members" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                Members Roster <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription className="text-xs">
              Passholders requiring renewal follow-up before access lapse.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {lists.expiringMemberships.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No memberships expiring in the next 7 days.
              </div>
            ) : (
              <div className="divide-y text-xs">
                {lists.expiringMemberships.map((m) => {
                  const daysLeft = Math.ceil((new Date(m.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-muted/40">
                      <div>
                        <div className="font-semibold text-foreground">{m.memberName}</div>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 mt-0.5">
                          {m.planName}
                        </Badge>
                      </div>
                      <Badge variant="secondary" className="text-[10px] text-amber-800 bg-amber-100">
                        {daysLeft} days left
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* List 5: Overdue Leads */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-red-600" />
                Overdue Leads ({lists.overdueLeads.length})
              </CardTitle>
              <Link href="/admin/leads" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                Sales Pipeline <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <CardDescription className="text-xs">
              Prospective players waiting over 2 hours without contact.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {lists.overdueLeads.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No overdue prospective trial leads.
              </div>
            ) : (
              <div className="divide-y text-xs">
                {lists.overdueLeads.map((l) => {
                  const hrs = Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 3600000);
                  return (
                    <div key={l.id} className="p-3.5 flex items-center justify-between hover:bg-muted/40">
                      <div>
                        <div className="font-semibold text-foreground">{l.name}</div>
                        <div className="text-[10px] text-muted-foreground">{l.source}</div>
                      </div>
                      <Badge variant="destructive" className="text-[10px] font-bold">
                        {hrs}h overdue
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Link Card: Financial Governance */}
        <Card className="shadow-xs bg-muted/30 border flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Ledger & Audit Integrity</CardTitle>
            <CardDescription className="text-xs">
              Every payment, court session, and cafeteria tab creates non-destructive double-entry ledger rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              To download a complete audit trail in CSV format, use the <strong>Export CSV</strong> button at the top of the page.
            </div>
            <Link href="/admin/expenses" className="w-full block">
              <Button variant="default" size="sm" className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                Record New Expense Voucher <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
