import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { resolveFinanceRange, getOwnerFinancials } from "@/lib/services/finance";
import { FinanceFilterBar } from "@/components/admin/finance-filter-bar";
import { ExpenseStatusToggle } from "@/components/admin/expense-status-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInrPrecise } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";
import { StaffManagement, StaffItem } from "@/components/admin/staff-management";

// Lazy-load Recharts bundle to keep page bundle lightweight
const FinanceCharts = nextDynamic(
  () => import("@/components/admin/finance-charts").then((mod) => mod.FinanceCharts),
  {
    loading: () => (
      <div className="h-[300px] w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse bg-muted/20 rounded-lg">
        Loading financial analytics charts...
      </div>
    ),
  }
);

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
  const [data, staffUsers] = await Promise.all([
    getOwnerFinancials(filter),
    prisma.user.findMany({
      where: { role: "STAFF" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bannedAt: true,
        createdAt: true,
      },
    }),
  ]);
  const { cards, charts, lists } = data;

  const formattedStaff: StaffItem[] = staffUsers.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    bannedAt: s.bannedAt,
    createdAt: s.createdAt,
  }));

  // Build transaction filter URL helper
  function txUrl(extra: Record<string, string> = {}) {
    const p = new URLSearchParams({
      range: filter.rangeType,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...extra,
    });
    return `/admin/transactions?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">Executive Finance</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/expenses"
            prefetch={false}
            className="text-xs font-medium text-[#1F4A33] hover:underline"
          >
            Manage Expenses
          </Link>
          <Link
            href={txUrl()}
            prefetch={false}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1F4A33] text-white hover:bg-[#1b402f] transition-colors"
          >
            Filter transactions
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <FinanceFilterBar currentRange={filter.rangeType} from={from} to={to} />

      {/* 6 Stat Cards in one CSS grid: 3 cols desktop, 2 tablet, 1 mobile; auto-rows-fr, equal width and height, plain white, 1px border, no icons, no arrows, no coloured left borders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-4">
        {/* 1. Earned */}
        <Link href={txUrl({ kind: "EARNED" })} prefetch={false} className="block h-full">
          <div className="h-full bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col justify-between hover:border-[#CBD5E1] transition-colors">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Earned Revenue</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-2">
              {formatInrPrecise(cards.earned)}
            </div>
            <div className="text-xs text-[#64748B] mt-1">Accrued from all served orders and bookings</div>
          </div>
        </Link>

        {/* 2. Collected */}
        <Link href={txUrl({ kind: "COLLECTED" })} prefetch={false} className="block h-full">
          <div className="h-full bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col justify-between hover:border-[#CBD5E1] transition-colors">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Collected Cash</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-2">
              {formatInrPrecise(cards.collected)}
            </div>
            <div className="text-xs text-[#64748B] mt-1">Cash, UPI and Card payments received in bank</div>
          </div>
        </Link>

        {/* 3. Outstanding */}
        <Link href="/admin/bar" prefetch={false} className="block h-full">
          <div className="h-full bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col justify-between hover:border-[#CBD5E1] transition-colors">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Outstanding</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-2">
              {formatInrPrecise(cards.outstanding)}
            </div>
            <div className="text-xs text-[#64748B] mt-1">
              {cards.outstanding > 0 ? "Unpaid bar tabs and active cafeteria tabs" : "All recognized revenue collected"}
            </div>
          </div>
        </Link>

        {/* 4. Refunded */}
        <Link href={txUrl({ kind: "REFUNDED" })} prefetch={false} className="block h-full">
          <div className="h-full bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col justify-between hover:border-[#CBD5E1] transition-colors">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Refunded</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-2">
              {formatInrPrecise(cards.refunded)}
            </div>
            <div className="text-xs text-[#64748B] mt-1">Shop returns and cancelled bookings</div>
          </div>
        </Link>

        {/* 5. Expenses */}
        <Link
          href={`/admin/expenses?range=${filter.rangeType}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`}
          prefetch={false}
          className="block h-full"
        >
          <div className="h-full bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col justify-between hover:border-[#CBD5E1] transition-colors">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Club Expenses</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-2">
              {formatInrPrecise(cards.expenses)}
            </div>
            <div className="text-xs text-[#64748B] mt-1">Procurement, inventory restocks, payroll and utilities</div>
          </div>
        </Link>

        {/* 6. Net Profit */}
        <Link href={txUrl()} prefetch={false} className="block h-full">
          <div className="h-full bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-col justify-between hover:border-[#CBD5E1] transition-colors">
            <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Net Operating Cash</div>
            <div className="text-2xl font-bold text-[#0F172A] mt-2">
              {formatInrPrecise(cards.net)}
            </div>
            <div className="text-xs text-[#64748B] mt-1">Total collections minus total operating expenses</div>
          </div>
        </Link>
      </div>

      {/* Charts Section: 2-column grid, 24px gaps, equal heights, no subtitle paragraphs */}
      <FinanceCharts
        revenueOverTime={charts.revenueOverTime}
        paymentMethodBreakdown={charts.paymentMethodBreakdown}
        topProducts={charts.topProducts}
        courtUtilisation={charts.courtUtilisation}
        rangeType={filter.rangeType}
        from={from}
        to={to}
      />

      {/* Lists Section: 2-column grid with equal heights and 24px gaps, headings and links on one baseline */}
      <div className="grid gap-6 md:grid-cols-2 auto-rows-fr">
        {/* List 1: Open Tabs */}
        <Card className="shadow-none border border-[#E2E8F0] bg-white flex flex-col justify-between">
          <div>
            <CardHeader className="px-5 pt-4 pb-3 flex flex-row items-baseline justify-between">
              <CardTitle className="text-sm font-semibold text-[#0F172A]">
                Active Open Tabs ({lists.openTabs.length})
              </CardTitle>
              <Link href="/admin/bar" prefetch={false} className="text-xs font-medium text-[#1F4A33] hover:underline">
                Filter transactions
              </Link>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {lists.openTabs.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  All bar tabs settled. No uncollected balance.
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {lists.openTabs.map((t) => (
                    <Link
                      key={t.id}
                      href="/admin/bar"
                      prefetch={false}
                      className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0 hover:bg-[#F8FAFC] px-1 rounded transition-colors"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#0F172A]">{t.tableName}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {t.memberName ? `Member: ${t.memberName}` : "Guest Tab"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-amber-700">{formatInrPrecise(t.balance)}</div>
                        <div className="text-[10px] text-[#64748B]">unpaid balance</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* List 2: Expenses Payable */}
        <Card className="shadow-none border border-[#E2E8F0] bg-white flex flex-col justify-between">
          <div>
            <CardHeader className="px-5 pt-4 pb-3 flex flex-row items-baseline justify-between">
              <CardTitle className="text-sm font-semibold text-[#0F172A]">
                Expenses Payable ({lists.expensesPayable.length})
              </CardTitle>
              <Link href="/admin/expenses" prefetch={false} className="text-xs font-medium text-[#1F4A33] hover:underline">
                Filter transactions
              </Link>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {lists.expensesPayable.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  All logged expenses are marked as paid.
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {lists.expensesPayable.map((exp) => (
                    <div key={exp.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                      <div>
                        <div className="text-xs font-semibold text-[#0F172A]">{exp.vendor}</div>
                        <div className="text-[11px] text-[#64748B]">{exp.category}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0F172A]">
                          {formatInrPrecise(exp.amountNum)}
                        </span>
                        <ExpenseStatusToggle expenseId={exp.id} isPaid={exp.isPaid} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Staff Management Section */}
      <StaffManagement staffList={formattedStaff} title="Club Staff Members" />
    </div>
  );
}
