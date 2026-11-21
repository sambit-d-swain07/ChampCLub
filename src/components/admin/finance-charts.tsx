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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ExternalLink } from "lucide-react";

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
  CASH: "#10b981", // Emerald
  CARD: "#3b82f6", // Blue
  UPI: "#8b5cf6",  // Purple
  ONLINE: "#f59e0b", // Amber
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
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. Revenue by Source Over Time */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Revenue by Source Over Time</CardTitle>
            <Link
              href={buildTxUrl({})}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Filter transactions <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <CardDescription className="text-xs">
            Daily collected revenue split across Courts, Pro Shop, Champions Bar, and Memberships. Click any source to view transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            {revenueOverTime.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No revenue recorded in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueOverTime} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString("en-IN")}`, ""]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar
                    dataKey="COURT"
                    name="Courts"
                    fill="#2563eb"
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                    className="cursor-pointer hover:opacity-85 transition-opacity"
                    onClick={() => handleBarClick("COURT")}
                  />
                  <Bar
                    dataKey="SHOP"
                    name="Pro Shop"
                    fill="#16a34a"
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                    className="cursor-pointer hover:opacity-85 transition-opacity"
                    onClick={() => handleBarClick("SHOP")}
                  />
                  <Bar
                    dataKey="BAR"
                    name="Champions Bar"
                    fill="#f59e0b"
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                    className="cursor-pointer hover:opacity-85 transition-opacity"
                    onClick={() => handleBarClick("BAR")}
                  />
                  <Bar
                    dataKey="MEMBERSHIP"
                    name="Memberships"
                    fill="#8b5cf6"
                    stackId="a"
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer hover:opacity-85 transition-opacity"
                    onClick={() => handleBarClick("MEMBERSHIP")}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Clickable Quick Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t mt-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">Explore by Source:</span>
            {[
              { label: "Courts", source: "COURT", color: "hover:border-blue-500 text-blue-700" },
              { label: "Pro Shop", source: "SHOP", color: "hover:border-emerald-500 text-emerald-700" },
              { label: "Champions Bar", source: "BAR", color: "hover:border-amber-500 text-amber-700" },
              { label: "Memberships", source: "MEMBERSHIP", color: "hover:border-purple-500 text-purple-700" },
            ].map((btn) => (
              <Link key={btn.source} href={buildTxUrl({ source: btn.source })}>
                <Badge
                  variant="outline"
                  className={`text-[10px] cursor-pointer hover:bg-muted/50 transition-all flex items-center gap-1 ${btn.color}`}
                >
                  {btn.label} <ArrowRight className="h-2.5 w-2.5" />
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Payment Method Breakdown */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Payment Method Breakdown</CardTitle>
            <Link
              href={buildTxUrl({})}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Filter transactions <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <CardDescription className="text-xs">
            Collections distribution by Cash, Card, UPI, and Online checkout. Click a method to view transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full flex items-center justify-center">
            {paymentMethodBreakdown.length === 0 || paymentMethodBreakdown.every((m) => m.amount === 0) ? (
              <div className="text-xs text-muted-foreground">No payments recorded in this period.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(val: any) => [`₹${Number(val || 0).toLocaleString("en-IN")}`, "Collected"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
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
                    onClick={(entry: any) => {
                      if (entry?.name) handleMethodClick(entry.name);
                    }}
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

          {/* Clickable Quick Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t mt-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">Explore by Method:</span>
            {paymentMethodBreakdown.map((item) => (
              <Link key={item.name} href={buildTxUrl({ method: item.name })}>
                <Badge
                  variant="outline"
                  className="text-[10px] cursor-pointer hover:bg-muted/50 transition-all flex items-center gap-1"
                >
                  {item.name}: ₹{item.amount.toLocaleString("en-IN")} <ArrowRight className="h-2.5 w-2.5" />
                </Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Top Products */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Top Products (Shop & Bar)</CardTitle>
            <Link href="/admin/shop" className="text-xs text-primary hover:underline flex items-center gap-1">
              Open Shop <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <CardDescription className="text-xs">
            Best performing equipment and food/beverage items by units sold. Click any item to manage stock in Pro Shop.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No sales logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, idx) => (
                <Link
                  key={p.name + idx}
                  href="/admin/shop"
                  className="group flex items-center justify-between border-b pb-2.5 last:border-0 hover:bg-muted/50 p-2 rounded-lg transition-all cursor-pointer"
                  tabIndex={0}
                  role="link"
                  aria-label={`Manage product ${p.name}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {p.name}
                      </div>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 mt-0.5">
                        {p.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <div className="text-xs font-bold text-foreground">{p.quantity} units</div>
                      <div className="text-[10px] text-muted-foreground">sold</div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Court Utilisation Percentage */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Court Utilisation Rate</CardTitle>
            <Link href="/admin/courts" className="text-xs text-primary hover:underline flex items-center gap-1">
              Courts Schedule <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <CardDescription className="text-xs">
            Percentage of 16 daily operating hours (06:00-22:00) booked per court. Click any court to view bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {courtUtilisation.map((court) => (
              <Link
                key={court.id}
                href={`/admin/courts?courtId=${court.id}${rangeType ? `&range=${rangeType}` : ""}`}
                className="group block space-y-1.5 p-2 rounded-lg hover:bg-muted/50 transition-all cursor-pointer"
                tabIndex={0}
                role="link"
                aria-label={`View schedule for court ${court.name}`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                    {court.name}{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">({court.sport})</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                  <span className="font-bold text-emerald-700">
                    {court.percentage}%{" "}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      ({court.bookedHours}h / {court.capacityHours}h)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      court.percentage > 75
                        ? "bg-emerald-600"
                        : court.percentage > 40
                          ? "bg-blue-600"
                          : "bg-amber-500"
                    }`}
                    style={{ width: `${court.percentage}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
