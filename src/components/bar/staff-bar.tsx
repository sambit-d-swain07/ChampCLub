"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  openTabAction,
  addOrderToTabAction,
  payTabAction,
  getShiftReportAction,
} from "@/app/actions/bar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wine,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Printer,
  CreditCard,
  Clock,
  Layers,
  UtensilsCrossed,
  Users,
  ChefHat,
  Sparkles,
  FileText,
  DollarSign,
  Loader2,
  X,
  UserCheck,
} from "lucide-react";

export interface BarTableItem {
  id: string;
  name: string;
  capacity: number;
  isOccupied: boolean;
  activeTab: {
    id: string;
    guestName: string | null;
    memberName: string | null;
    memberId: string | null;
    openedAt: string;
    totalAmount: number;
    totalPaid: number;
    balance: number;
    orders: Array<{
      id: string;
      status: string;
      personLabel: string;
      totalAmount: number;
      createdAt: string;
      items: Array<{
        id: string;
        name: string;
        quantity: number;
        price: number;
        basePrice: number;
        discount: number;
      }>;
    }>;
  } | null;
}

export interface BarMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQty: number;
  reorderLevel: number;
}

export interface MemberOption {
  id: string;
  membershipNo: string;
  name: string;
  planName: string;
  barDiscountPct: number;
}

interface StaffBarProps {
  tables: BarTableItem[];
  menuItems: BarMenuItem[];
  members: MemberOption[];
}

export function StaffBar({ tables, menuItems, members }: StaffBarProps) {
  const router = useRouter();

  const [selectedTable, setSelectedTable] = useState<BarTableItem | null>(null);

  // Open Tab Modal
  const [openingForTable, setOpeningForTable] = useState<BarTableItem | null>(null);
  const [openMemberId, setOpenMemberId] = useState<string>("");
  const [openGuestName, setOpenGuestName] = useState<string>("");
  const [isOpeningTab, setIsOpeningTab] = useState(false);
  const [openTabError, setOpenTabError] = useState<string | null>(null);

  // Add Items Modal
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [orderPersonLabel, setOrderPersonLabel] = useState("Person 1");
  const [orderItemsCart, setOrderItemsCart] = useState<Array<{ item: BarMenuItem; quantity: number }>>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [addOrderError, setAddOrderError] = useState<string | null>(null);

  // Pay / Split Tab Modal
  const [isPayingTab, setIsPayingTab] = useState(false);
  const [splitRows, setSplitRows] = useState<
    Array<{ method: "CASH" | "CARD" | "UPI" | "ONLINE"; amount: number; personLabel: string }>
  >([{ method: "CARD", amount: 0, personLabel: "All / Split 1" }]);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Shift Close Report Modal
  const [isViewingShiftReport, setIsViewingShiftReport] = useState(false);
  const [shiftReport, setShiftReport] = useState<any | null>(null);
  const [loadingShiftReport, setLoadingShiftReport] = useState(false);

  // Find currently active tab for selected table
  const currentTab = selectedTable?.activeTab || null;

  // Derive active table after mutation
  const activeSelectedTable = tables.find((t) => t.id === selectedTable?.id) || selectedTable;

  // Open Tab handler
  const handleOpenTab = async () => {
    if (!openingForTable) return;
    setIsOpeningTab(true);
    setOpenTabError(null);

    const res = await openTabAction({
      tableId: openingForTable.id,
      memberId: openMemberId ? openMemberId : null,
      guestName: openMemberId ? null : openGuestName || "Walk-in Guest",
    });

    setIsOpeningTab(false);

    if (!res.success) {
      setOpenTabError(res.error || "Failed to open tab.");
      return;
    }

    setOpeningForTable(null);
    setOpenMemberId("");
    setOpenGuestName("");
    router.refresh();
  };

  // Add Item to Order Cart
  const addItemToCart = (item: BarMenuItem) => {
    const existing = orderItemsCart.find((i) => i.item.id === item.id);
    if (existing) {
      setOrderItemsCart(
        orderItemsCart.map((i) =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setOrderItemsCart([...orderItemsCart, { item, quantity: 1 }]);
    }
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setOrderItemsCart(
      orderItemsCart
        .map((i) => {
          if (i.item.id === itemId) {
            const next = i.quantity + delta;
            return next <= 0 ? null : { ...i, quantity: next };
          }
          return i;
        })
        .filter(Boolean) as typeof orderItemsCart
    );
  };

  // Submit Order to Tab
  const handleSubmitOrderToTab = async () => {
    if (!activeSelectedTable?.activeTab || orderItemsCart.length === 0) return;
    setIsSubmittingOrder(true);
    setAddOrderError(null);

    const res = await addOrderToTabAction({
      tabId: activeSelectedTable.activeTab.id,
      personLabel: orderPersonLabel || "Guest",
      items: orderItemsCart.map((c) => ({
        barItemId: c.item.id,
        quantity: c.quantity,
      })),
    });

    setIsSubmittingOrder(false);

    if (!res.success) {
      setAddOrderError(res.error || "Failed to send order to kitchen.");
      return;
    }

    setOrderItemsCart([]);
    setIsAddingItems(false);
    router.refresh();
  };

  // Init Split Payment Modal
  const openPaymentModal = () => {
    if (!activeSelectedTable?.activeTab) return;
    const balance = activeSelectedTable.activeTab.balance;

    // Group person labels from orders on this tab
    const orders = activeSelectedTable.activeTab.orders;
    const people = Array.from(new Set(orders.map((o) => o.personLabel).filter(Boolean)));

    if (people.length > 1) {
      // Calculate each person's share
      const personTotals = new Map<string, number>();
      for (const ord of orders) {
        personTotals.set(
          ord.personLabel,
          (personTotals.get(ord.personLabel) || 0) + ord.totalAmount
        );
      }

      const rows = people.map((p) => ({
        method: "CARD" as const,
        amount: Math.round(personTotals.get(p) || balance / people.length),
        personLabel: p,
      }));
      setSplitRows(rows);
    } else {
      setSplitRows([
        { method: "CARD", amount: balance, personLabel: "Full Bill" },
      ]);
    }

    setIsPayingTab(true);
    setPaymentError(null);
  };

  // Submit Split Payment
  const handlePayTabSubmit = async () => {
    if (!activeSelectedTable?.activeTab) return;
    setIsSubmittingPayment(true);
    setPaymentError(null);

    const res = await payTabAction({
      tabId: activeSelectedTable.activeTab.id,
      payments: splitRows.map((r) => ({
        method: r.method,
        amount: Number(r.amount),
        personLabel: r.personLabel,
      })),
    });

    setIsSubmittingPayment(false);

    if (!res.success) {
      setPaymentError(res.error || "Failed to process payment.");
      return;
    }

    setIsPayingTab(false);
    setSelectedTable(null);
    router.refresh();
  };

  // Open Shift Close Report
  const handleOpenShiftReport = async () => {
    setIsViewingShiftReport(true);
    setLoadingShiftReport(true);
    const data = await getShiftReportAction();
    setShiftReport(data);
    setLoadingShiftReport(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Wine className="h-6 w-6 text-emerald-600" />
            Champions Bar & Cafeteria POS
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage table tabs, add rounds with person labels, send orders to the live kitchen board, and split bills.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/kitchen" target="_blank">
            <Button variant="outline" size="sm" className="text-xs font-bold border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/20">
              <ChefHat className="h-4 w-4 mr-1.5 text-amber-600" />
              Open Kitchen Board ↗
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={handleOpenShiftReport}
            className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Shift Close Report
          </Button>
        </div>
      </div>

      {/* Main Grid: Tables (7 cols) + Selected Table Active Tab (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table Floor Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Club Floor & Table Map
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Free
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Occupied Tab
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {tables.map((table) => {
              const isSelected = activeSelectedTable?.id === table.id;

              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between h-32 ${
                    isSelected
                      ? "ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20"
                      : table.isOccupied
                      ? "border-amber-300 bg-amber-50/15 dark:bg-amber-950/10 hover:border-amber-400"
                      : "border-border bg-card hover:border-emerald-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-black tracking-tight text-foreground line-clamp-1">
                      {table.name.split(" (")[0]}
                    </span>
                    <Badge
                      className={`text-[9px] px-1.5 py-0 ${
                        table.isOccupied
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-emerald-600/15 text-emerald-700 border-emerald-300"
                      }`}
                    >
                      {table.isOccupied ? "OCCUPIED" : "FREE"}
                    </Badge>
                  </div>

                  <div className="my-auto">
                    {table.isOccupied && table.activeTab ? (
                      <div>
                        <div className="text-[11px] font-bold text-foreground line-clamp-1">
                          {table.activeTab.memberName || table.activeTab.guestName || "Walk-in"}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Bal: <strong className="text-emerald-700">₹{table.activeTab.balance.toFixed(0)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Cap: {table.capacity}
                      </div>
                    )}
                  </div>

                  <div className="pt-1 border-t text-[10px] font-semibold text-muted-foreground flex justify-between items-center">
                    <span>{table.name.includes("(") ? table.name.split("(")[1].replace(")", "") : "Lounge"}</span>
                    <span className="text-emerald-600 font-bold">{isSelected ? "Viewing" : "Select"} →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Table / Tab Inspection Panel */}
        <div className="lg:col-span-5">
          {activeSelectedTable ? (
            <Card className="sticky top-20 shadow-md border-emerald-600/20">
              <CardHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between">
                <div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                    Table Details
                  </Badge>
                  <CardTitle className="text-base font-extrabold mt-0.5">
                    {activeSelectedTable.name}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedTable(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {activeSelectedTable.isOccupied && activeSelectedTable.activeTab ? (
                  <>
                    {/* Customer & Tab Info */}
                    <div className="p-3 bg-muted/40 rounded-lg space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tab Holder:</span>
                        <strong className="text-foreground">
                          {activeSelectedTable.activeTab.memberName || activeSelectedTable.activeTab.guestName}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Opened:</span>
                        <span>
                          {new Date(activeSelectedTable.activeTab.openedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total F&B Orders:</span>
                        <span>₹{activeSelectedTable.activeTab.totalAmount.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Payments Collected:</span>
                        <span className="text-emerald-600 font-semibold">
                          -₹{activeSelectedTable.activeTab.totalPaid.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-1.5 font-bold text-sm text-foreground">
                        <span>Outstanding Balance:</span>
                        <span className="text-emerald-700 dark:text-emerald-400">
                          ₹{activeSelectedTable.activeTab.balance.toFixed(0)}
                        </span>
                      </div>
                    </div>

                    {/* Order Lines grouped with Person Label */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-muted-foreground uppercase">
                          Tab Orders ({activeSelectedTable.activeTab.orders.length})
                        </span>
                        <Button
                          size="sm"
                          onClick={() => setIsAddingItems(true)}
                          className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Items / Round
                        </Button>
                      </div>

                      <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                        {activeSelectedTable.activeTab.orders.length === 0 ? (
                          <div className="p-6 text-center text-xs text-muted-foreground">
                            No orders added to this tab yet.
                          </div>
                        ) : (
                          activeSelectedTable.activeTab.orders.map((ord) => (
                            <div key={ord.id} className="p-2.5 text-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <Badge variant="outline" className="text-[10px] font-bold">
                                  {ord.personLabel}
                                </Badge>
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    className={`text-[9px] ${
                                      ord.status === "SERVED"
                                        ? "bg-slate-900 text-white"
                                        : ord.status === "READY"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-amber-500 text-white"
                                    }`}
                                  >
                                    {ord.status}
                                  </Badge>
                                  <span className="font-bold text-foreground">
                                    ₹{ord.totalAmount.toFixed(0)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-[11px] text-muted-foreground pl-1">
                                {ord.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Tab Actions */}
                    <div className="pt-2 space-y-2">
                      <Button
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-10 shadow"
                        disabled={activeSelectedTable.activeTab.balance <= 0}
                        onClick={openPaymentModal}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Split & Settle Tab (₹{activeSelectedTable.activeTab.balance.toFixed(0)})
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Free Table: Open Tab Option */
                  <div className="text-center py-8 space-y-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Table is Currently Free</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Capacity: {activeSelectedTable.capacity} guests. Open a tab to seat members or walk-in guests.
                      </p>
                    </div>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      onClick={() => setOpeningForTable(activeSelectedTable)}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Open Tab for {activeSelectedTable.name.split(" (")[0]}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="p-8 text-center border-dashed">
              <Wine className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <h3 className="text-sm font-semibold text-foreground">No Table Selected</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Click on any table on the floor map to manage orders, add rounds, or settle the tab.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* MODAL 1: OPEN TAB DIALOG */}
      {openingForTable && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl animate-in fade-in-50">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Wine className="h-5 w-5 text-emerald-600" />
                  Open Bar Tab
                </CardTitle>
                <CardDescription className="text-xs">{openingForTable.name}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpeningForTable(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Select Member (Applies F&B Discount)
                </label>
                <select
                  className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 focus:ring-1 focus:ring-emerald-600"
                  value={openMemberId}
                  onChange={(e) => {
                    setOpenMemberId(e.target.value);
                    if (e.target.value) setOpenGuestName("");
                  }}
                >
                  <option value="">Walk-in Guest (No Member Discount)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.membershipNo}) - {m.planName} ({m.barDiscountPct}% OFF)
                    </option>
                  ))}
                </select>
              </div>

              {!openMemberId && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Walk-in Guest Name
                  </label>
                  <Input
                    placeholder="e.g. John Doe / Group A"
                    value={openGuestName}
                    onChange={(e) => setOpenGuestName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              )}

              {openTabError && (
                <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{openTabError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setOpeningForTable(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isOpeningTab}
                  onClick={handleOpenTab}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isOpeningTab ? "Opening..." : "Confirm & Open Tab"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 2: ADD ITEMS / ROUND WITH PERSON LABEL */}
      {isAddingItems && activeSelectedTable?.activeTab && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full shadow-2xl animate-in fade-in-50 max-h-[90vh] flex flex-col">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
                  Add Round / Items to Tab
                </CardTitle>
                <CardDescription className="text-xs">
                  {activeSelectedTable.name} • Tab Holder: {activeSelectedTable.activeTab.memberName || activeSelectedTable.activeTab.guestName}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsAddingItems(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Person Label Input */}
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200">
                <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 block mb-1">
                  Tag Order with &ldquo;Person&rdquo; Label:
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Person 1, Guest B, Alice"
                    value={orderPersonLabel}
                    onChange={(e) => setOrderPersonLabel(e.target.value)}
                    className="text-xs h-8 bg-white dark:bg-slate-900"
                  />
                  <div className="flex gap-1">
                    {["Person 1", "Person 2", "Person 3", "Person 4"].map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setOrderPersonLabel(p)}
                        className="text-[10px] h-8 px-2"
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Menu Items Grid */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Select F&B Items:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto border rounded-md p-2">
                  {menuItems.map((item) => {
                    const inCart = orderItemsCart.find((i) => i.item.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className="p-2 rounded border bg-card flex justify-between items-center text-xs hover:border-emerald-300"
                      >
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            ₹{item.price} • {item.category}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={inCart ? "default" : "outline"}
                          className="h-7 text-xs font-semibold px-2"
                          onClick={() => addItemToCart(item)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {inCart ? `Added (${inCart.quantity})` : "Add"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cart List */}
              {orderItemsCart.length > 0 && (
                <div className="border rounded-md p-3 space-y-2 bg-muted/20">
                  <div className="text-xs font-bold flex justify-between items-center">
                    <span>Order Cart ({orderPersonLabel})</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOrderItemsCart([])}
                      className="h-6 text-[10px] text-destructive"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="divide-y text-xs">
                    {orderItemsCart.map((i) => (
                      <div key={i.item.id} className="py-1.5 flex justify-between items-center">
                        <span>{i.item.name}</span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-5 w-5"
                            onClick={() => updateCartQty(i.item.id, -1)}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </Button>
                          <span className="font-bold w-4 text-center">{i.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-5 w-5"
                            onClick={() => updateCartQty(i.item.id, 1)}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </Button>
                          <span className="font-mono font-bold w-12 text-right">
                            ₹{i.item.price * i.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {addOrderError && (
                <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{addOrderError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t shrink-0">
                <Button variant="outline" size="sm" onClick={() => setIsAddingItems(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={orderItemsCart.length === 0 || isSubmittingOrder}
                  onClick={handleSubmitOrderToTab}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmittingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Sending to Kitchen...
                    </>
                  ) : (
                    <>
                      <ChefHat className="h-4 w-4 mr-1.5" />
                      Send to Kitchen Board
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 3: SPLIT PAYMENT DIALOG */}
      {isPayingTab && activeSelectedTable?.activeTab && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full shadow-2xl animate-in fade-in-50">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  Split & Settle Bar Tab
                </CardTitle>
                <CardDescription className="text-xs">
                  {activeSelectedTable.name} • Total Due: ₹{activeSelectedTable.activeTab.balance.toFixed(0)}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsPayingTab(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-muted-foreground uppercase">
                    Split Payment Breakdown:
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() =>
                      setSplitRows([
                        ...splitRows,
                        { method: "CASH", amount: 0, personLabel: `Split ${splitRows.length + 1}` },
                      ])
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Split Method
                  </Button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {splitRows.map((row, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg border bg-muted/20 flex gap-2 items-center text-xs">
                      <Input
                        placeholder="Label"
                        value={row.personLabel}
                        onChange={(e) => {
                          const updated = [...splitRows];
                          updated[idx].personLabel = e.target.value;
                          setSplitRows(updated);
                        }}
                        className="h-8 text-xs w-28 shrink-0"
                      />
                      <select
                        className="h-8 text-xs rounded-md border border-input bg-background px-2"
                        value={row.method}
                        onChange={(e) => {
                          const updated = [...splitRows];
                          updated[idx].method = e.target.value as any;
                          setSplitRows(updated);
                        }}
                      >
                        <option value="CARD">CARD</option>
                        <option value="CASH">CASH</option>
                        <option value="UPI">UPI</option>
                        <option value="ONLINE">ONLINE</option>
                      </select>
                      <div className="flex-1 flex items-center gap-1">
                        <span className="text-muted-foreground font-mono">₹</span>
                        <Input
                          type="number"
                          value={row.amount}
                          onChange={(e) => {
                            const updated = [...splitRows];
                            updated[idx].amount = Number(e.target.value) || 0;
                            setSplitRows(updated);
                          }}
                          className="h-8 text-xs font-bold"
                        />
                      </div>
                      {splitRows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setSplitRows(splitRows.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bg-muted/40 p-3 rounded-lg flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Paying Now:</span>
                  <strong className="text-sm font-extrabold text-foreground">
                    ₹{splitRows.reduce((a, b) => a + Number(b.amount), 0).toFixed(0)}
                  </strong>
                </div>
              </div>

              {paymentError && (
                <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-start gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setIsPayingTab(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={isSubmittingPayment}
                  onClick={handlePayTabSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmittingPayment ? "Writing Ledger..." : "Confirm Payment & Collect"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 4: SHIFT CLOSE REPORT */}
      {isViewingShiftReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl bg-white text-slate-900 border-2">
            <CardHeader className="p-6 border-b text-center relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 h-7 w-7 text-slate-500"
                onClick={() => setIsViewingShiftReport(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="h-10 w-10 mx-auto rounded-full bg-slate-900 text-white flex items-center justify-center mb-2">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">THE CHAMPIONS CLUB</h2>
              <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                Bar & Cafeteria Shift Close Report
              </p>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                {shiftReport?.shiftDate || "Today's Shift"}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4 text-xs">
              {loadingShiftReport ? (
                <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  Aggregating ledger entries...
                </div>
              ) : shiftReport ? (
                <>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Staff Member:</span>
                    <span className="font-bold text-slate-900">{shiftReport.staffName}</span>
                  </div>

                  {/* Revenue Summary */}
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 border">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Total Earned (Served):</span>
                      <span className="font-bold text-slate-900">
                        ₹{shiftReport.earnedTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Total Collected:</span>
                      <span className="font-black text-emerald-700 text-sm">
                        ₹{shiftReport.totalCollected.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Collected Breakdown by Method */}
                  <div className="space-y-1.5 border-b pb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Collected By Payment Method:
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-600">CASH:</span>
                      <span className="font-mono font-semibold">₹{(shiftReport.collectedByMethod?.CASH || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">CARD:</span>
                      <span className="font-mono font-semibold">₹{(shiftReport.collectedByMethod?.CARD || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">UPI:</span>
                      <span className="font-mono font-semibold">₹{(shiftReport.collectedByMethod?.UPI || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">ONLINE:</span>
                      <span className="font-mono font-semibold">₹{(shiftReport.collectedByMethod?.ONLINE || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Open Tabs Outstanding Total */}
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-xs">Still-Open Tabs Total:</div>
                      <div className="text-[10px] text-amber-700">
                        Across {shiftReport.openTabsCount} active tables
                      </div>
                    </div>
                    <span className="font-black text-sm">
                      ₹{shiftReport.stillOpenTabsTotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      Print Report
                    </Button>
                    <Button
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                      onClick={() => setIsViewingShiftReport(false)}
                    >
                      Done
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
