"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  placeCounterOrderAction,
  updateOrderStatusAction,
} from "@/app/actions/shop";
import { MemberIdInput, ResolvedMember } from "@/components/admin/member-id-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PaginationBar } from "@/components/ui/pagination-bar";
import { formatInrPrecise } from "@/lib/site-settings";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  Loader2,
  X,
} from "lucide-react";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  stockQty: number;
  reorderLevel: number;
  isLowStock: boolean;
}

export interface OrderRecord {
  id: string;
  createdAt: string;
  channel: "COUNTER" | "ONLINE";
  fulfilment: "PICKUP" | "DELIVERY" | "COURT";
  status: string;
  totalAmount: number;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface GearUpQueueItem {
  bookingId: string;
  courtName: string;
  startsAt: string;
  playerName: string;
  neededOrders: Array<{
    orderId: string;
    items: string;
    totalAmount: number;
  }>;
}

interface StaffPosProps {
  inventory: InventoryItem[];
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  categories: string[];
  currentQuery?: string;
  currentCategory?: string;
  recentOrders: OrderRecord[];
  gearUpQueue: GearUpQueueItem[];
}

export function StaffPos({
  inventory,
  totalProducts,
  currentPage,
  totalPages,
  categories,
  currentQuery = "",
  currentCategory = "ALL",
  recentOrders: initialOrders,
  gearUpQueue,
}: StaffPosProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<"pos" | "orders" | "gear-up">("pos");

  // Search input state with 300ms debounce
  const [searchInput, setSearchInput] = useState(currentQuery);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cart State (stored above the grid so pagination keeps it intact)
  const [cart, setCart] = useState<
    Array<{
      productId: string;
      product: InventoryItem;
      quantity: number;
    }>
  >([]);

  // Customer Selection & Checkout
  const [customerType, setCustomerType] = useState<"GUEST" | "MEMBER">("GUEST");
  const [resolvedMember, setResolvedMember] = useState<ResolvedMember | null>(null);
  const [guestName, setGuestName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");

  // Async States
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Sync prop changes
  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  // Debounced navigation helper
  const navigateWithFilters = (q: string, cat: string, page = 1) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (q.trim()) params.set("q", q.trim());
    if (cat && cat !== "ALL") params.set("category", cat);
    router.push(`/admin/shop?${params.toString()}`);
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      navigateWithFilters(val, currentCategory, 1);
    }, 300);
  };

  const handleCategorySelect = (cat: string) => {
    navigateWithFilters(searchInput, cat, 1);
  };

  // Selected Member calculation
  const discountPct = customerType === "MEMBER" && resolvedMember ? resolvedMember.shopDiscountPct : 0;

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = (subtotal * discountPct) / 100;
  const netTotal = Math.max(0, subtotal - discountAmount);

  // Cart Handlers
  const addToCart = (product: InventoryItem) => {
    const existing = cart.find((i) => i.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty >= product.stockQty) return;

    if (existing) {
      setCart(
        cart.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([...cart, { productId: product.id, product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stockQty) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as typeof cart
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.productId !== productId));
  };

  // Complete Counter Sale with Idempotency Key & Error handling
  const handleCheckout = async () => {
    if (cart.length === 0 || submittingOrder) return;
    if (customerType === "MEMBER" && !resolvedMember) {
      setOrderError("Please verify member ID first.");
      return;
    }

    setSubmittingOrder(true);
    setOrderError(null);

    // Unique idempotency key per checkout attempt
    const clientRequestId = "req_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);

    const payload = {
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      memberId: customerType === "MEMBER" && resolvedMember ? resolvedMember.id : null,
      guestName: customerType === "MEMBER" ? null : guestName.trim() || "Walk-in Guest",
      paymentMethod,
      clientRequestId,
    };

    const res = await placeCounterOrderAction(payload);
    setSubmittingOrder(false);

    if (!res.success) {
      // KEEP the cart on failure so staff does not lose scanned items!
      setOrderError("Payment did not go through. Please try again.");
      return;
    }

    // Set Receipt
    setReceiptData({
      orderId: (res as any).order?.id || "ORD-" + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
      customerName:
        customerType === "MEMBER" && resolvedMember
          ? `${resolvedMember.name} (${resolvedMember.membershipNo})`
          : guestName.trim() || "Walk-in Guest",
      channel: "COUNTER",
      paymentMethod,
      items: cart.map((i) => {
        const itemDiscount = (i.product.price * discountPct) / 100;
        return {
          name: i.product.name,
          quantity: i.quantity,
          basePrice: i.product.price,
          unitPrice: i.product.price - itemDiscount,
          total: (i.product.price - itemDiscount) * i.quantity,
        };
      }),
      subtotal,
      discountAmount,
      netTotal,
    });

    // Clear Cart on successful sale
    setCart([]);
    setResolvedMember(null);
    setCustomerType("GUEST");
    setGuestName("");
    router.refresh();
  };

  // Status Change Handler
  const handleOrderStatusChange = async (
    orderId: string,
    newStatus: "PENDING" | "COMPLETED" | "CANCELLED"
  ) => {
    setUpdatingOrderId(orderId);
    const res = await updateOrderStatusAction({ orderId, status: newStatus });
    setUpdatingOrderId(null);

    if (res.success) {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">Pro Shop POS</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Counter sales, member discounts, and gear-up requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === "pos" ? "default" : "outline"}
            onClick={() => setActiveTab("pos")}
            className={activeTab === "pos" ? "bg-[#23513C] text-white hover:bg-[#1b402f] text-xs" : "text-xs"}
          >
            Counter POS
          </Button>
          <Button
            size="sm"
            variant={activeTab === "orders" ? "default" : "outline"}
            onClick={() => setActiveTab("orders")}
            className={activeTab === "orders" ? "bg-[#23513C] text-white hover:bg-[#1b402f] text-xs" : "text-xs"}
          >
            Order Dispatch ({orders.filter((o) => o.status === "PENDING").length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === "gear-up" ? "default" : "outline"}
            onClick={() => setActiveTab("gear-up")}
            className={activeTab === "gear-up" ? "bg-[#23513C] text-white hover:bg-[#1b402f] text-xs" : "text-xs"}
          >
            Court Gear-Up ({gearUpQueue.length})
          </Button>
        </div>
      </div>

      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Catalog & Search (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Search and Category Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
                <Input
                  placeholder="Search products by name or category..."
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 text-xs h-9 bg-white border-[#E2E8F0]"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      navigateWithFilters("", currentCategory, 1);
                    }}
                    className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-[#0F172A]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <Button
                  size="sm"
                  variant={currentCategory === "ALL" ? "default" : "outline"}
                  onClick={() => handleCategorySelect("ALL")}
                  className={`h-9 text-xs shrink-0 ${
                    currentCategory === "ALL"
                      ? "bg-[#23513C] text-white hover:bg-[#1b402f]"
                      : "bg-white border-[#E2E8F0] text-[#0F172A]"
                  }`}
                >
                  All
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={currentCategory === cat ? "default" : "outline"}
                    onClick={() => handleCategorySelect(cat)}
                    className={`h-9 text-xs shrink-0 ${
                      currentCategory === cat
                        ? "bg-[#23513C] text-white hover:bg-[#1b402f]"
                        : "bg-white border-[#E2E8F0] text-[#0F172A]"
                    }`}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* 3x3 Product Grid (9 products per page) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory.map((product) => {
                const cartItem = cart.find((i) => i.productId === product.id);
                const cartQty = cartItem ? cartItem.quantity : 0;
                const isOutOfStock = product.stockQty <= 0;

                return (
                  <Card
                    key={product.id}
                    className={`shadow-none border border-[#E2E8F0] bg-white transition-all flex flex-col justify-between ${
                      isOutOfStock ? "opacity-60 bg-[#F8FAFC]" : ""
                    }`}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[11px] font-medium text-[#64748B] uppercase tracking-wider truncate">
                          {product.category}
                        </span>
                        {isOutOfStock ? (
                          <span className="text-[10px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                            Out of stock
                          </span>
                        ) : product.isLowStock ? (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {product.stockQty} left
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {product.stockQty} in stock
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-sm font-semibold text-[#0F172A] line-clamp-1 mt-1">
                        {product.name}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-bold text-[#0F172A]">
                          {formatInrPrecise(product.price)}
                        </span>
                        {product.sku && (
                          <span className="text-[10px] text-[#94A3B8] font-mono">
                            {product.sku}
                          </span>
                        )}
                      </div>

                      {/* Add to Sale Button (Restock button removed here) */}
                      <Button
                        size="sm"
                        disabled={isOutOfStock || cartQty >= product.stockQty}
                        onClick={() => addToCart(product)}
                        className={`w-full text-xs font-semibold h-8 ${
                          cartQty > 0
                            ? "bg-[#23513C] hover:bg-[#1b402f] text-white"
                            : "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {cartQty > 0 ? `Added (${cartQty})` : "Add to Sale"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {inventory.length === 0 && (
              <div className="text-center p-12 bg-white rounded-lg border border-[#E2E8F0]">
                <p className="text-xs text-[#64748B]">
                  No products found matching &ldquo;{currentQuery}&rdquo;.
                </p>
              </div>
            )}

            {/* Pagination Bar */}
            <PaginationBar
              currentPage={currentPage}
              totalItems={totalProducts}
              pageSize={9}
            />
          </div>

          {/* Checkout / Cart Panel (4 cols) */}
          <div className="lg:col-span-4">
            <Card className="sticky top-20 shadow-none border border-[#E2E8F0] bg-white">
              <CardHeader className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-semibold text-[#0F172A]">
                    POS Sale Checkout
                  </CardTitle>
                  {cart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Customer Lookup or Walk-in */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
                    Customer Lookup
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={customerType === "GUEST" ? "default" : "outline"}
                      onClick={() => {
                        setCustomerType("GUEST");
                        setResolvedMember(null);
                      }}
                      className={`flex-1 text-xs h-8 ${
                        customerType === "GUEST" ? "bg-[#23513C] text-white hover:bg-[#1b402f]" : ""
                      }`}
                    >
                      Walk-in Guest
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={customerType === "MEMBER" ? "default" : "outline"}
                      onClick={() => setCustomerType("MEMBER")}
                      className={`flex-1 text-xs h-8 ${
                        customerType === "MEMBER" ? "bg-[#23513C] text-white hover:bg-[#1b402f]" : ""
                      }`}
                    >
                      Club Member
                    </Button>
                  </div>

                  {customerType === "GUEST" ? (
                    <Input
                      placeholder="Walk-in Guest Name (Optional)"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="text-xs h-8 bg-white border-[#E2E8F0]"
                    />
                  ) : (
                    <MemberIdInput
                      onMemberResolved={(mem) => setResolvedMember(mem)}
                      placeholder="Enter Member ID (e.g. CC-1001)"
                    />
                  )}

                  {discountPct > 0 && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                      {resolvedMember?.planName} discount active: {discountPct}% off shop purchases
                    </div>
                  )}
                </div>

                {/* Cart Items */}
                <div className="space-y-2 border-t border-[#E2E8F0] pt-3">
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
                    Sale Items ({cart.reduce((acc, i) => acc + i.quantity, 0)})
                  </label>

                  {cart.length === 0 ? (
                    <div className="text-xs text-[#64748B] py-6 text-center border border-dashed border-[#E2E8F0] rounded">
                      Scan or click products on the left to add to sale.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F1F5F9] max-h-56 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div key={item.productId} className="py-2 flex items-center justify-between text-xs">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="font-semibold text-[#0F172A] truncate">
                              {item.product.name}
                            </div>
                            <div className="text-[11px] text-[#64748B]">
                              {formatInrPrecise(item.product.price)} each
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, -1)}
                              className="w-6 h-6 rounded border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC]"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center font-semibold text-[#0F172A]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, 1)}
                              disabled={item.quantity >= item.product.stockQty}
                              className="w-6 h-6 rounded border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.productId)}
                              className="w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-700 ml-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subtotals */}
                <div className="space-y-1.5 border-t border-[#E2E8F0] pt-3 text-xs">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Gross Subtotal</span>
                    <span>{formatInrPrecise(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Member Discount ({discountPct}%)</span>
                      <span>-{formatInrPrecise(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#0F172A] pt-1 border-t border-[#F1F5F9]">
                    <span>Net Payable</span>
                    <span>{formatInrPrecise(netTotal)}</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["CASH", "CARD", "UPI"] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`h-8 text-xs font-semibold rounded transition-colors ${
                          paymentMethod === method
                            ? "bg-[#23513C] text-white"
                            : "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Friendly Error Display */}
                {orderError && (
                  <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                    {orderError}
                  </div>
                )}

                {/* Complete Sale Button */}
                <Button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || submittingOrder}
                  className="w-full text-xs font-semibold h-10 bg-[#23513C] hover:bg-[#1b402f] text-white disabled:opacity-50"
                >
                  {submittingOrder ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing payment...
                    </span>
                  ) : (
                    `Complete Sale (${formatInrPrecise(netTotal)})`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <Card className="shadow-none border border-[#E2E8F0] bg-white">
          <CardHeader className="p-4 border-b border-[#E2E8F0]">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">
              Shop Orders & Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-[#E2E8F0]">
                  <TableHead className="text-xs text-[#64748B]">Order ID</TableHead>
                  <TableHead className="text-xs text-[#64748B]">Customer</TableHead>
                  <TableHead className="text-xs text-[#64748B]">Channel</TableHead>
                  <TableHead className="text-xs text-[#64748B]">Items</TableHead>
                  <TableHead className="text-xs text-[#64748B] text-right">Amount</TableHead>
                  <TableHead className="text-xs text-[#64748B]">Status</TableHead>
                  <TableHead className="text-xs text-[#64748B] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="border-[#F1F5F9]">
                    <TableCell className="text-xs font-mono font-medium text-[#0F172A]">
                      {order.id.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-xs text-[#0F172A] font-medium">
                      {order.customerName}
                    </TableCell>
                    <TableCell className="text-xs text-[#64748B]">{order.channel}</TableCell>
                    <TableCell className="text-xs text-[#64748B] max-w-xs truncate">
                      {order.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-right text-[#0F172A]">
                      {formatInrPrecise(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                          order.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700"
                            : order.status === "CANCELLED"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {order.status === "PENDING" && (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingOrderId === order.id}
                            onClick={() => handleOrderStatusChange(order.id, "COMPLETED")}
                            className="h-7 text-[11px] text-emerald-700 hover:bg-emerald-50"
                          >
                            Mark Completed
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={updatingOrderId === order.id}
                            onClick={() => handleOrderStatusChange(order.id, "CANCELLED")}
                            className="h-7 text-[11px] text-red-600 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Gear-Up Tab */}
      {activeTab === "gear-up" && (
        <Card className="shadow-none border border-[#E2E8F0] bg-white">
          <CardHeader className="p-4 border-b border-[#E2E8F0]">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">
              Court Equipment Gear-Up Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {gearUpQueue.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                No pending court gear-up equipment requests today.
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {gearUpQueue.map((item) => (
                  <div key={item.bookingId} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A]">
                        {item.courtName} • {item.playerName}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {item.neededOrders.map((o) => o.items).join(" | ")}
                      </div>
                    </div>
                    <span className="text-xs text-[#64748B]">
                      {new Date(item.startsAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sale Receipt Dialog */}
      {receiptData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 space-y-4 border border-[#E2E8F0]">
            <div className="text-center border-b border-[#E2E8F0] pb-3">
              <CheckCircle2 className="h-8 w-8 text-[#23513C] mx-auto mb-1.5" />
              <h2 className="text-sm font-bold text-[#0F172A]">Champions Club Pro Shop</h2>
              <p className="text-[11px] text-[#64748B]">Official Sale Receipt</p>
              <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{receiptData.orderId}</p>
            </div>

            <div className="text-xs space-y-1 text-[#64748B]">
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-semibold text-[#0F172A]">{receiptData.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="font-semibold text-[#0F172A]">{receiptData.paymentMethod}</span>
              </div>
            </div>

            <div className="border-t border-b border-[#E2E8F0] py-2 divide-y divide-[#F1F5F9] max-h-48 overflow-y-auto">
              {receiptData.items.map((it: any, idx: number) => (
                <div key={idx} className="py-1.5 flex justify-between text-xs">
                  <div>
                    <div className="font-medium text-[#0F172A]">{it.name}</div>
                    <div className="text-[10px] text-[#64748B]">
                      {it.quantity} x {formatInrPrecise(it.unitPrice)}
                    </div>
                  </div>
                  <div className="font-semibold text-[#0F172A]">{formatInrPrecise(it.total)}</div>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-sm font-bold text-[#0F172A]">
                <span>Total Paid:</span>
                <span>{formatInrPrecise(receiptData.netTotal)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="flex-1 text-xs"
              >
                <Printer className="h-3.5 w-3.5 mr-1" />
                Print
              </Button>
              <Button
                size="sm"
                onClick={() => setReceiptData(null)}
                className="flex-1 text-xs bg-[#23513C] text-white hover:bg-[#1b402f]"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
