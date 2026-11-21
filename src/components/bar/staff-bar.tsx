"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  openTabAction,
  addOrderToTabAction,
  payTabAction,
  freeTableAction,
  getShiftReportAction,
} from "@/app/actions/bar";
import { MemberIdInput, ResolvedMember } from "@/components/admin/member-id-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Wine,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  CreditCard,
  Clock,
  UtensilsCrossed,
  Users,
  ChefHat,
  FileText,
  Loader2,
  X,
  AlertCircle,
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
  members?: MemberOption[];
}

export function StaffBar({ tables, menuItems }: StaffBarProps) {
  const router = useRouter();

  const [selectedTable, setSelectedTable] = useState<BarTableItem | null>(null);

  // Open Tab Modal
  const [openingForTable, setOpeningForTable] = useState<BarTableItem | null>(null);
  const [openCustomerType, setOpenCustomerType] = useState<"GUEST" | "MEMBER">("GUEST");
  const [openResolvedMember, setOpenResolvedMember] = useState<ResolvedMember | null>(null);
  const [openGuestName, setOpenGuestName] = useState<string>("");
  const [isOpeningTab, setIsOpeningTab] = useState(false);
  const [openTabError, setOpenTabError] = useState<string | null>(null);

  // Add Items Modal
  const [isAddingItems, setIsAddingItems] = useState(false);
  const [orderItemsCart, setOrderItemsCart] = useState<Array<{ item: BarMenuItem; quantity: number }>>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [addOrderError, setAddOrderError] = useState<string | null>(null);

  // Settle Tab Modal (No split rows, CASH/CARD/UPI only, default CASH)
  const [isPayingTab, setIsPayingTab] = useState(false);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Free Table Confirm Modal
  const [confirmFreeTable, setConfirmFreeTable] = useState(false);
  const [isFreeingTable, setIsFreeingTable] = useState(false);
  const [freeTableError, setFreeTableError] = useState<string | null>(null);

  // Shift Close Report Modal
  const [isViewingShiftReport, setIsViewingShiftReport] = useState(false);
  const [shiftReport, setShiftReport] = useState<any | null>(null);
  const [loadingShiftReport, setLoadingShiftReport] = useState(false);

  // Derive active table after mutation
  const activeSelectedTable = tables.find((t) => t.id === selectedTable?.id) || selectedTable;

  // Open Tab handler
  const handleOpenTab = async () => {
    if (!openingForTable) return;
    if (openCustomerType === "MEMBER" && !openResolvedMember) {
      setOpenTabError("Please verify member ID first.");
      return;
    }

    setIsOpeningTab(true);
    setOpenTabError(null);

    const res = await openTabAction({
      tableId: openingForTable.id,
      memberId: openCustomerType === "MEMBER" && openResolvedMember ? openResolvedMember.id : null,
      guestName: openCustomerType === "MEMBER" ? null : openGuestName.trim() || "Walk-in Guest",
    });

    setIsOpeningTab(false);

    if (!res.success) {
      setOpenTabError(res.error || "Failed to open tab.");
      return;
    }

    setOpeningForTable(null);
    setOpenResolvedMember(null);
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

  // Submit Order to Tab (No person label)
  const handleSubmitOrderToTab = async () => {
    if (!activeSelectedTable?.activeTab || orderItemsCart.length === 0) return;
    setIsSubmittingOrder(true);
    setAddOrderError(null);

    const res = await addOrderToTabAction({
      tabId: activeSelectedTable.activeTab.id,
      personLabel: null,
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

  // Init Settle Payment Modal
  const openPaymentModal = () => {
    if (!activeSelectedTable?.activeTab) return;
    const balance = activeSelectedTable.activeTab.balance;
    setSettleAmount(balance);
    setSettleMethod("CASH");
    setIsPayingTab(true);
    setPaymentError(null);
  };

  // Submit Settle Payment (Single payment, CASH/CARD/UPI)
  const handlePayTabSubmit = async () => {
    if (!activeSelectedTable?.activeTab) return;
    if (settleAmount <= 0) {
      setPaymentError("Payment amount must be greater than zero.");
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError(null);

    const res = await payTabAction({
      tabId: activeSelectedTable.activeTab.id,
      payments: [
        {
          method: settleMethod,
          amount: Number(settleAmount),
        },
      ],
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

  // Free Table Action
  const handleFreeTable = async () => {
    if (!activeSelectedTable) return;
    setIsFreeingTable(true);
    setFreeTableError(null);

    const res = await freeTableAction({
      tableId: activeSelectedTable.id,
      tabId: activeSelectedTable.activeTab?.id,
    });

    setIsFreeingTable(false);

    if (!res.success) {
      setFreeTableError(res.error || "Failed to free table.");
      return;
    }

    setConfirmFreeTable(false);
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

  // Table free-ability calculation
  const currentTabBalance = activeSelectedTable?.activeTab?.balance ?? 0;
  const currentOrders = activeSelectedTable?.activeTab?.orders ?? [];
  const hasOpenKitchenOrders = currentOrders.some((o) =>
    ["NEW", "ACCEPTED", "PREPARING", "READY"].includes(o.status)
  );
  const canFreeTable = currentTabBalance <= 0.01 && !hasOpenKitchenOrders;
  let freeTableDisabledReason = "";
  if (currentTabBalance > 0.01) {
    freeTableDisabledReason = `Outstanding balance of ₹${currentTabBalance.toFixed(0)} must be settled first`;
  } else if (hasOpenKitchenOrders) {
    freeTableDisabledReason = "Kitchen orders are still being prepared";
  }

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
            Manage table tabs, seat guests, send rounds to the live kitchen board, and settle tabs.
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
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Bal: <strong className="text-amber-700 dark:text-amber-400">₹{table.activeTab.balance.toFixed(0)}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground">
                        Cap: {table.capacity}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                    <span className="truncate max-w-[80px]">
                      {table.name.includes("(") ? table.name.split("(")[1].replace(")", "") : "Main"}
                    </span>
                    <span className="text-emerald-600 font-semibold">{isSelected ? "Viewing" : "Select →"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Table Detail Panel */}
        <div className="lg:col-span-5">
          {activeSelectedTable ? (
            <Card className="sticky top-20 shadow-md border-emerald-600/30">
              <CardHeader className="p-4 border-b bg-muted/40 flex flex-row items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase text-muted-foreground">Table Details</div>
                  <CardTitle className="text-base font-bold text-foreground">
                    {activeSelectedTable.name}
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSelectedTable(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {activeSelectedTable.isOccupied && activeSelectedTable.activeTab ? (
                  <>
                    {/* Tab Header Stats */}
                    <div className="bg-muted/30 p-3 rounded-lg space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tab Holder:</span>
                        <span className="font-bold text-foreground">
                          {activeSelectedTable.activeTab.memberName || activeSelectedTable.activeTab.guestName || "Walk-in"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Opened:</span>
                        <span className="text-muted-foreground">
                          {new Date(activeSelectedTable.activeTab.openedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total F&B Orders:</span>
                        <span className="font-semibold text-foreground">
                          ₹{activeSelectedTable.activeTab.totalAmount.toFixed(0)}
                        </span>
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

                    {/* Order Lines */}
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
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  #{ord.id.slice(-5).toUpperCase()}
                                </span>
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

                    {/* Tab Actions: Settle Tab & Free Table */}
                    <div className="pt-2 space-y-2">
                      <Button
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-10 shadow"
                        disabled={activeSelectedTable.activeTab.balance <= 0}
                        onClick={openPaymentModal}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Settle Tab (₹{activeSelectedTable.activeTab.balance.toFixed(0)})
                      </Button>

                      <div className="space-y-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canFreeTable || isFreeingTable}
                          onClick={() => setConfirmFreeTable(true)}
                          className="w-full border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold h-9 disabled:opacity-50"
                          title={freeTableDisabledReason || "Free this table"}
                        >
                          {isFreeingTable ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : null}
                          Free Table
                        </Button>
                        {freeTableDisabledReason && (
                          <p className="text-[10px] text-muted-foreground text-center">
                            {freeTableDisabledReason}
                          </p>
                        )}
                      </div>
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

      {/* MODAL 1: OPEN TAB DIALOG (Uses MemberIdInput) */}
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
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Tab Holder
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 rounded-lg">
                  <Button
                    type="button"
                    variant={openCustomerType === "GUEST" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setOpenCustomerType("GUEST");
                      setOpenResolvedMember(null);
                    }}
                    className="text-xs h-7"
                  >
                    Walk-in Guest
                  </Button>
                  <Button
                    type="button"
                    variant={openCustomerType === "MEMBER" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setOpenCustomerType("MEMBER")}
                    className="text-xs h-7"
                  >
                    Club Member
                  </Button>
                </div>

                {openCustomerType === "MEMBER" ? (
                  <MemberIdInput onMemberResolved={setOpenResolvedMember} />
                ) : (
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
              </div>

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
                  disabled={isOpeningTab || (openCustomerType === "MEMBER" && !openResolvedMember)}
                  onClick={handleOpenTab}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
                >
                  {isOpeningTab ? "Opening..." : "Confirm & Open Tab"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 2: ADD ITEMS / ROUND (No Person Label) */}
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
                    <span>Order Cart</span>
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

      {/* MODAL 3: SETTLE TAB (No split rows, CASH/CARD/UPI only, default CASH) */}
      {isPayingTab && activeSelectedTable?.activeTab && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl animate-in fade-in-50">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  Settle Bar Tab
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
              <div className="space-y-3">
                <div className="bg-muted/30 p-3 rounded-lg flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Outstanding Balance:</span>
                  <span className="font-bold text-foreground text-sm">
                    ₹{activeSelectedTable.activeTab.balance.toFixed(0)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Payment Amount
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-muted-foreground font-mono">₹</span>
                    <Input
                      type="number"
                      value={settleAmount}
                      onChange={(e) => setSettleAmount(Math.max(0, Number(e.target.value)))}
                      className="text-sm font-bold h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["CASH", "CARD", "UPI"] as const).map((method) => (
                      <Button
                        key={method}
                        type="button"
                        variant={settleMethod === method ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSettleMethod(method)}
                        className="text-xs font-semibold h-8"
                      >
                        {method}
                      </Button>
                    ))}
                  </div>
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
                  disabled={isSubmittingPayment || settleAmount <= 0}
                  onClick={handlePayTabSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmittingPayment ? "Writing Ledger..." : `Confirm & Settle ₹${settleAmount.toFixed(0)}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 4: CONFIRM FREE TABLE */}
      {confirmFreeTable && activeSelectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-sm w-full shadow-2xl animate-in fade-in-50 bg-white">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-bold text-red-700 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Free {activeSelectedTable.name.split(" (")[0]}?
              </CardTitle>
              <CardDescription className="text-xs pt-1">
                This will close the active tab and mark the table as FREE on the club floor map.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {freeTableError && (
                <div className="p-2.5 rounded bg-red-50 text-red-700 text-xs border border-red-200">
                  {freeTableError}
                </div>
              )}
              <p className="text-xs text-gray-600">
                Are you sure you want to release this table?
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmFreeTable(false)}
                  disabled={isFreeingTable}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleFreeTable}
                  disabled={isFreeingTable}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {isFreeingTable ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Confirm & Free Table
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 5: SHIFT CLOSE REPORT */}
      {isViewingShiftReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl animate-in fade-in-50 max-h-[85vh] flex flex-col">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  Bar Shift Close Report
                </CardTitle>
                <CardDescription className="text-xs">
                  Summary of payments collected during this shift
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsViewingShiftReport(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {loadingShiftReport ? (
                <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating shift totals...
                </div>
              ) : shiftReport ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200">
                    <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">
                      Total Shift Revenue
                    </div>
                    <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                      ₹{shiftReport.totalCollected.toFixed(0)}
                    </div>
                  </div>

                  <div className="space-y-1.5 border rounded-lg p-3">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">
                      Collections by Payment Method:
                    </span>
                    <div className="space-y-1 pt-1 divide-y">
                      {shiftReport.byMethod.map((m: any) => (
                        <div key={m.method} className="pt-1 flex justify-between items-center">
                          <span className="font-semibold">{m.method}</span>
                          <span className="font-mono font-bold">₹{m.amount.toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border rounded-lg p-3 space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Shift Closed Tabs:</span>
                      <strong className="text-foreground">{shiftReport.tabsCount}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total F&B Orders:</span>
                      <strong className="text-foreground">{shiftReport.ordersCount}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No shift data available.
                </div>
              )}

              <div className="flex justify-end pt-2 border-t shrink-0">
                <Button size="sm" onClick={() => setIsViewingShiftReport(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
