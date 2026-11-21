"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getKitchenOrdersAction,
  updateBarOrderStatusAction,
} from "@/app/actions/bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UtensilsCrossed,
  ArrowRight,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Coffee,
  ChefHat,
  BellRing,
} from "lucide-react";

export interface KitchenOrderItem {
  id: string;
  tabId: string;
  status: "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  personLabel: string;
  tableName: string;
  customerName: string;
  createdAt: string;
  ageMinutes: number;
  isOverdue: boolean;
  totalAmount: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}

export function KitchenBoard({ initialOrders }: { initialOrders: KitchenOrderItem[] }) {
  const [orders, setOrders] = useState<KitchenOrderItem[]>(initialOrders);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("Just now");

  // Fetch kitchen orders
  const refreshOrders = async () => {
    try {
      const data = await getKitchenOrdersAction();
      setOrders(data as KitchenOrderItem[]);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      // ignore transient polling error
    }
  };

  // Poll every 3 seconds (3000ms) without websockets
  useEffect(() => {
    const timer = setInterval(() => {
      refreshOrders();
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleStatusChange = async (
    orderId: string,
    newStatus: "NEW" | "PREPARING" | "READY" | "SERVED" | "CANCELLED"
  ) => {
    setUpdatingId(orderId);
    // Optimistic local update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    const res = await updateBarOrderStatusAction({ orderId, status: newStatus });
    setUpdatingId(null);

    if (res.success) {
      await refreshOrders();
    }
  };

  // Kanban Columns
  const columns: Array<{
    title: string;
    status: "NEW" | "PREPARING" | "READY" | "SERVED";
    color: string;
    icon: any;
  }> = [
    { title: "NEW ORDERS", status: "NEW", color: "border-blue-500 bg-blue-50/20 text-blue-700", icon: BellRing },
    { title: "PREPARING (IN KITCHEN)", status: "PREPARING", color: "border-amber-500 bg-amber-50/20 text-amber-700", icon: Flame },
    { title: "READY FOR PICKUP", status: "READY", color: "border-emerald-500 bg-emerald-50/20 text-emerald-700", icon: CheckCircle2 },
    { title: "SERVED (COMPLETED)", status: "SERVED", color: "border-slate-300 bg-slate-50/20 text-slate-600", icon: UtensilsCrossed },
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 text-white p-4 rounded-xl shadow-md border border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/admin/bar">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-9 w-9 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Champions Kitchen & Cafeteria Display</h1>
            <p className="text-xs text-slate-400">
              Live automated kitchen order management. Polling active every 3 seconds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Polling (3s) • {lastUpdated}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setIsRefreshing(true);
              await refreshOrders();
              setIsRefreshing(false);
            }}
            disabled={isRefreshing}
            className="text-xs text-slate-900 bg-white hover:bg-slate-100 h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 4-Column Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.status);
          const ColIcon = col.icon;

          return (
            <div key={col.status} className="bg-muted/40 rounded-xl border p-3 flex flex-col space-y-3 min-h-[600px]">
              {/* Column Header */}
              <div className="flex justify-between items-center pb-2 border-b">
                <div className="flex items-center gap-2">
                  <ColIcon className="h-4 w-4 text-foreground" />
                  <span className="text-xs font-bold tracking-wider uppercase text-foreground">{col.title}</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs px-2 py-0">
                  {colOrders.length}
                </Badge>
              </div>

              {/* Order Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colOrders.length === 0 ? (
                  <div className="text-center py-12 text-xs text-muted-foreground">
                    No orders in this stage.
                  </div>
                ) : (
                  colOrders.map((order) => {
                    return (
                      <Card
                        key={order.id}
                        className={`transition-all shadow-sm border-2 ${
                          order.isOverdue
                            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 ring-2 ring-red-400 animate-pulse"
                            : "border-border bg-card"
                        }`}
                      >
                        <CardHeader className="p-3.5 pb-2">
                          <div className="flex justify-between items-start gap-1">
                            <div>
                              <Badge className="bg-slate-900 text-white text-[11px] font-bold">
                                {order.tableName}
                              </Badge>
                              <div className="text-[11px] font-semibold text-muted-foreground mt-1">
                                {order.customerName}
                              </div>
                            </div>

                            {/* Age Counter - Turns Red after 10 minutes */}
                            <div className="flex flex-col items-end">
                              <Badge
                                variant={order.isOverdue ? "destructive" : "outline"}
                                className={`text-[10px] font-mono flex items-center gap-1 ${
                                  order.isOverdue ? "bg-red-600 text-white font-black" : "text-muted-foreground"
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {order.ageMinutes}m ago
                              </Badge>
                              {order.isOverdue && (
                                <span className="text-[9px] font-black tracking-tight text-red-600 uppercase mt-0.5">
                                  OVERDUE &gt;10M
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-1 flex items-center justify-between">
                            <span>Table Order</span>
                            <span className="font-mono text-[11px]">#{order.id.slice(-5).toUpperCase()}</span>
                          </div>
                        </CardHeader>

                        <CardContent className="p-3.5 pt-1 space-y-3">
                          {/* Itemized List */}
                          <div className="border-t border-b py-2 space-y-1.5 text-xs">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between items-center">
                                <span className="font-semibold text-foreground">{item.name}</span>
                                <Badge variant="secondary" className="font-bold text-xs h-5 px-1.5">
                                  x{item.quantity}
                                </Badge>
                              </div>
                            ))}
                          </div>

                          {/* One-Click Status Change Buttons */}
                          <div className="flex items-center gap-1.5">
                            {order.status === "NEW" && (
                              <Button
                                size="sm"
                                disabled={updatingId === order.id}
                                onClick={() => handleStatusChange(order.id, "PREPARING")}
                                className="w-full text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white h-8"
                              >
                                {updatingId === order.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                ) : (
                                  <Flame className="h-3.5 w-3.5 mr-1" />
                                )}
                                Start Preparing →
                              </Button>
                            )}

                            {order.status === "PREPARING" && (
                              <Button
                                size="sm"
                                disabled={updatingId === order.id}
                                onClick={() => handleStatusChange(order.id, "READY")}
                                className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                              >
                                {updatingId === order.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                )}
                                Mark Ready for Table →
                              </Button>
                            )}

                            {order.status === "READY" && (
                              <Button
                                size="sm"
                                disabled={updatingId === order.id}
                                onClick={() => handleStatusChange(order.id, "SERVED")}
                                className="w-full text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white h-8 shadow"
                              >
                                {updatingId === order.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                                ) : (
                                  <UtensilsCrossed className="h-3.5 w-3.5 mr-1" />
                                )}
                                Serve to Table (Recognize Earned)
                              </Button>
                            )}

                            {order.status === "SERVED" && (
                              <div className="w-full text-center py-1 text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Served & Earned Recorded
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
