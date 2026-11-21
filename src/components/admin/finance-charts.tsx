"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatInrPrecise } from "@/lib/site-settings";

interface FinanceChartsProps {
  revenueOverTime: Array<{
    date: string;
    COURT: number;
    SHOP: number;
    BAR: number;
    MEMBERSHIP: number;
  }>;
  paymentMethodBreakdown: Array<{
    name: string;
    amount: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    category: string;
  }>;
  courtUtilisation: Array<{
    id: string;
    name: string;
    sport: string;
    bookedHours: number;
    capacityHours: number;
    percentage: number;
  }>;
  rangeType?: string;
  from?: string;
  to?: string;
}

const METHOD_COLORS: Record<string, string> = {
  CASH: "#1F4A33",
  CARD: "#0F2236",
  UPI: "#8FBBE0",
  ONLINE: "#BF3F0D",
};

export function FinanceCharts({
  revenueOverTime,
  paymentMethodBreakdown,
  topProducts,
  courtUtilisation,
  rangeType,
  from,
  to,
}: FinanceChartsProps) {
  const router = useRouter();

  const buildTxUrl = (params: Record<string, string>) => {
    const p = new URLSearchParams({
      ...(rangeType ? { range: rangeType } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...params,
    });
    return `/admin/transactions?${p.toString()}`;
  };

  const handleBarClick = (source: string) => {
    router.push(buildTxUrl({ source }));
  };

  const handleMethodClick = (method: string) => {
    router.push(buildTxUrl({ method }));
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 auto-rows-fr">
      {/* 1. Revenue by Source Over Time */}
      <Card className="shadow-none border border-[#E2E8F0] bg-white flex flex-col justify-between">
        <div>
          <CardHeader className="px-5 pt-4 pb-2 flex flex-row items-baseline justify-between">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">Revenue by Source Over Time</CardTitle>
            <Link
              href={buildTxUrl({})}
              prefetch={false}
              className="text-xs font-medium text-[#1F4A33] hover:underline"
            >
              Filter transactions
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="h-[260px] w-full">
              {revenueOverTime.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                  No revenue recorded in this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueOverTime} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} stroke="#64748B" />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      stroke="#64748B"
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatInrPrecise(Number(val || 0)), ""]}
                      contentStyle={{ borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar
                      dataKey="COURT"
                      name="Courts"
                      fill="#2563eb"
                      stackId="a"
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick("COURT")}
                    />
                    <Bar
                      dataKey="SHOP"
                      name="Pro Shop"
                      fill="#16a34a"
                      stackId="a"
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick("SHOP")}
                    />
                    <Bar
                      dataKey="BAR"
                      name="Champions Bar"
                      fill="#f59e0b"
                      stackId="a"
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick("BAR")}
                    />
                    <Bar
                      dataKey="MEMBERSHIP"
                      name="Memberships"
                      fill="#8b5cf6"
                      stackId="a"
                      className="cursor-pointer hover:opacity-85 transition-opacity"
                      onClick={() => handleBarClick("MEMBERSHIP")}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick Filter Links */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#F1F5F9] mt-2">
              <span className="text-[11px] text-[#64748B] font-medium">Source:</span>
              {[
                { label: "Courts", source: "COURT" },
                { label: "Pro Shop", source: "SHOP" },
                { label: "Bar", source: "BAR" },
                { label: "Memberships", source: "MEMBERSHIP" },
              ].map((btn) => (
                <Link
                  key={btn.source}
                  href={buildTxUrl({ source: btn.source })}
                  prefetch={false}
                  className="text-xs text-[#1F4A33] hover:underline"
                >
                  {btn.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* 2. Payment Method Breakdown */}
      <Card className="shadow-none border border-[#E2E8F0] bg-white flex flex-col justify-between">
        <div>
          <CardHeader className="px-5 pt-4 pb-2 flex flex-row items-baseline justify-between">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">Payment Method Breakdown</CardTitle>
            <Link
              href={buildTxUrl({})}
              prefetch={false}
              className="text-xs font-medium text-[#1F4A33] hover:underline"
            >
              Filter transactions
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="h-[260px] w-full flex items-center justify-center">
              {paymentMethodBreakdown.length === 0 || paymentMethodBreakdown.every((m) => m.amount === 0) ? (
                <div className="text-xs text-[#64748B]">No payments recorded in this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      formatter={(val: any) => [formatInrPrecise(Number(val || 0)), "Collected"]}
                      contentStyle={{ borderRadius: "6px", border: "1px solid #E2E8F0", fontSize: "12px" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                    <Pie
                      data={paymentMethodBreakdown}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={3}
                      className="cursor-pointer"
                    >
                      {paymentMethodBreakdown.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={METHOD_COLORS[entry.name] || "#94a3b8"}
                          className="cursor-pointer hover:opacity-85 transition-opacity"
                          tabIndex={0}
                          role="button"
                          aria-label={`View ${entry.name} transactions`}
                          onClick={() => handleMethodClick(entry.name)}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Quick Filter Links */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#F1F5F9] mt-2">
              <span className="text-[11px] text-[#64748B] font-medium">Method:</span>
              {paymentMethodBreakdown.map((item) => (
                <Link
                  key={item.name}
                  href={buildTxUrl({ method: item.name })}
                  prefetch={false}
                  className="text-xs text-[#1F4A33] hover:underline"
                >
                  {item.name}: {formatInrPrecise(item.amount)}
                </Link>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* 3. Top Products */}
      <Card className="shadow-none border border-[#E2E8F0] bg-white flex flex-col justify-between">
        <div>
          <CardHeader className="px-5 pt-4 pb-2 flex flex-row items-baseline justify-between">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">Top Products (Shop & Bar)</CardTitle>
            <Link href="/admin/inventory" prefetch={false} className="text-xs font-medium text-[#1F4A33] hover:underline">
              Filter transactions
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {topProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                No sales logged yet.
              </div>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, idx) => (
                  <div
                    key={p.name + idx}
                    className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 last:border-0"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-[#64748B] w-4 font-medium">#{idx + 1}</span>
                      <div>
                        <div className="text-xs font-semibold text-[#0F172A]">{p.name}</div>
                        <div className="text-[11px] text-[#64748B]">{p.category}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#0F172A]">{p.quantity} units</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </Card>

      {/* 4. Court Utilisation Percentage */}
      <Card className="shadow-none border border-[#E2E8F0] bg-white flex flex-col justify-between">
        <div>
          <CardHeader className="px-5 pt-4 pb-2 flex flex-row items-baseline justify-between">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">Court Utilisation Rate</CardTitle>
            <Link href="/admin/courts" prefetch={false} className="text-xs font-medium text-[#1F4A33] hover:underline">
              Filter transactions
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="space-y-3">
              {courtUtilisation.map((court) => (
                <div key={court.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#0F172A]">
                      {court.name} <span className="text-[11px] text-[#64748B]">({court.sport})</span>
                    </span>
                    <span className="font-semibold text-[#0F172A]">
                      {court.percentage}% <span className="text-[11px] text-[#64748B]">({court.bookedHours}h / {court.capacityHours}h)</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-[#1F4A33] rounded-full"
                      style={{ width: `${court.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
