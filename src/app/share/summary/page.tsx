import Link from "next/link";
import { verifyShareToken, resolveFinanceRange, getOwnerFinancials } from "@/lib/services/finance";
import { FinanceCharts } from "@/components/admin/finance-charts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, CreditCard, AlertCircle, RotateCcw, Receipt, Scale, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SharedSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-4 p-8 border rounded-xl bg-card shadow-sm">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Invalid Link</h1>
          <p className="text-xs text-muted-foreground">
            No authorization token was provided in the URL.
          </p>
          <Link href="/" className="inline-block text-xs text-primary underline">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const verified = verifyShareToken(token);
  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-4 p-8 border rounded-xl bg-card shadow-sm">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
          <h1 className="text-xl font-bold">Report Link Expired</h1>
          <p className="text-xs text-muted-foreground">
            This secure shared summary link has expired or the digital signature is invalid.
            Please request a fresh link from the club owner.
          </p>
          <Link href="/" className="inline-block text-xs text-primary underline">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const filter = resolveFinanceRange(verified.range, verified.from, verified.to);
  const data = await getOwnerFinancials(filter);
  const { cards, charts } = data;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Read-Only Banner Header */}
      <header className="border-b bg-card/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-foreground">THE CHAMPIONS CLUB</div>
              <div className="text-[10px] text-muted-foreground uppercase font-semibold">Executive Financial Report</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] gap-1 border-emerald-300 text-emerald-800 bg-emerald-50">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              Verified Read-Only View
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Range: {filter.label}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Financial Summary ({filter.label})</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Certified double-entry ledger totals and operating performance snapshot.
          </p>
        </div>

        {/* 6 KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Card className="shadow-xs border-l-4 border-l-blue-600">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-black text-foreground">₹{cards.earned.toLocaleString("en-IN")}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Accrued orders</p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-l-4 border-l-emerald-600">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Collected</CardTitle>
              <CreditCard className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-black text-foreground">₹{cards.collected.toLocaleString("en-IN")}</div>
              <p className="text-[10px] text-emerald-700 mt-0.5">Cash & receipts</p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-black text-amber-700">₹{cards.outstanding.toLocaleString("en-IN")}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Uncollected tabs</p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-l-4 border-l-rose-500">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Refunded</CardTitle>
              <RotateCcw className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-black text-foreground">₹{cards.refunded.toLocaleString("en-IN")}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Reversals</p>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-l-4 border-l-purple-600">
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Expenses</CardTitle>
              <Receipt className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-black text-foreground">₹{cards.expenses.toLocaleString("en-IN")}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Operating costs</p>
            </CardContent>
          </Card>

          <Card className={`shadow-xs border-l-4 ${cards.net >= 0 ? "border-l-teal-600" : "border-l-red-600"}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1.5 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase text-muted-foreground">Net Cash</CardTitle>
              <Scale className={`h-4 w-4 ${cards.net >= 0 ? "text-teal-600" : "text-red-600"}`} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className={`text-xl font-black ${cards.net >= 0 ? "text-teal-800" : "text-red-700"}`}>
                ₹{cards.net.toLocaleString("en-IN")}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Operating balance</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <FinanceCharts
          revenueOverTime={charts.revenueOverTime}
          paymentMethodBreakdown={charts.paymentMethodBreakdown}
          topProducts={charts.topProducts}
          courtUtilisation={charts.courtUtilisation}
        />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground bg-muted/20">
        <p>© 2026 The Champions Club · Read-Only Audited Financial Statement</p>
      </footer>
    </div>
  );
}
