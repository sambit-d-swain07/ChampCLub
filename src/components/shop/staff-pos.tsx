"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  placeCounterOrderAction,
  restockProductAction,
  updateOrderStatusAction,
} from "@/app/actions/shop";
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
  ShoppingBag,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Printer,
  PackagePlus,
  CreditCard,
  Clock,
  Layers,
  Truck,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQty: number;
  reorderLevel: number;
  isLowStock: boolean;
  soldLast14d: number;
  daysLeft: number | null;
}

export interface MemberOption {
  id: string;
  membershipNo: string;
  name: string;
  planName: string;
  shopDiscountPct: number;
}

export interface OrderRecord {
  id: string;
  createdAt: string;
  channel: "COUNTER" | "ONLINE";
  fulfilment: "PICKUP" | "DELIVERY";
  status: "PENDING" | "COMPLETED" | "CANCELLED";
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
  members: MemberOption[];
  recentOrders: OrderRecord[];
  gearUpQueue: GearUpQueueItem[];
}

export function StaffPos({
  inventory: initialInventory,
  members,
  recentOrders: initialOrders,
  gearUpQueue,
}: StaffPosProps) {
  const router = useRouter();

  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<"pos" | "orders" | "gear-up">("pos");

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Cart State
  const [cart, setCart] = useState<
    Array<{
      productId: string;
      product: InventoryItem;
      quantity: number;
    }>
  >([]);

  // Member Selection
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [guestName, setGuestName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI" | "ONLINE">("CARD");

  // Modals & Async States
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // Restock Modal
  const [restockItem, setRestockItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState("10");
  const [restocking, setRestocking] = useState(false);

  // Status updating
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Derive categories
  const categories = ["ALL", ...Array.from(new Set(inventory.map((i) => i.category)))];

  // Filtered inventory
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Selected Member calculation
  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const discountPct = selectedMember ? selectedMember.shopDiscountPct : 0;

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

  // Complete Counter Sale
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setSubmittingOrder(true);
    setOrderError(null);

    const payload = {
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      memberId: selectedMemberId ? selectedMemberId : null,
      guestName: selectedMemberId ? null : guestName || "Walk-in Guest",
      paymentMethod,
    };

    const res = await placeCounterOrderAction(payload);
    setSubmittingOrder(false);

    if (!res.success) {
      setOrderError(res.error || "Failed to process sale.");
      return;
    }

    // Set Receipt
    setReceiptData({
      orderId: res.order?.id || "ORD-" + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
      customerName: selectedMember ? `${selectedMember.name} (${selectedMember.membershipNo})` : guestName || "Walk-in Guest",
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

    // Deduct stock locally in state
    setInventory((prev) =>
      prev.map((item) => {
        const bought = cart.find((c) => c.productId === item.id);
        if (bought) {
          const newQty = Math.max(0, item.stockQty - bought.quantity);
          return {
            ...item,
            stockQty: newQty,
            isLowStock: newQty <= item.reorderLevel,
          };
        }
        return item;
      })
    );

    // Clear Cart
    setCart([]);
    setSelectedMemberId("");
    setGuestName("");
    router.refresh();
  };

  // Restock Handler
  const handleRestockSubmit = async () => {
    if (!restockItem) return;
    const qty = parseInt(restockQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    setRestocking(true);
    const res = await restockProductAction({
      productId: restockItem.id,
      addQty: qty,
    });
    setRestocking(false);

    if (res.success && "product" in res && res.product) {
      const updatedProduct = res.product;
      setInventory((prev) =>
        prev.map((i) =>
          i.id === restockItem.id
            ? {
                ...i,
                stockQty: updatedProduct.stockQty,
                isLowStock: updatedProduct.stockQty <= i.reorderLevel,
              }
            : i
        )
      );
      setRestockItem(null);
      setRestockQty("10");
      router.refresh();
    }
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
      {/* Top Header / View Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-emerald-600" />
            Pro Shop & Inventory Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single shared stock across counter sales, online orders, and court equipment requests.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
          <Button
            variant={activeTab === "pos" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("pos")}
            className="text-xs font-semibold"
          >
            <Receipt className="h-4 w-4 mr-1.5" />
            Counter POS
          </Button>
          <Button
            variant={activeTab === "orders" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("orders")}
            className="text-xs font-semibold relative"
          >
            <Layers className="h-4 w-4 mr-1.5" />
            Order Dispatch
            {orders.filter((o) => o.status === "PENDING").length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] rounded-full">
                {orders.filter((o) => o.status === "PENDING").length}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === "gear-up" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("gear-up")}
            className="text-xs font-semibold"
          >
            <Truck className="h-4 w-4 mr-1.5" />
            Court Gear-Up Queue
            {gearUpQueue.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-emerald-600 text-white text-[10px] rounded-full">
                {gearUpQueue.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* VIEW 1: POS TERMINAL */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Product Catalog Grid (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment, strings, grips, apparel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="text-xs whitespace-nowrap"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredInventory.map((product) => {
                const inCart = cart.find((i) => i.productId === product.id);
                const cartQty = inCart ? inCart.quantity : 0;
                const isOutOfStock = product.stockQty <= 0;

                return (
                  <Card
                    key={product.id}
                    className={`overflow-hidden transition-all border ${
                      product.isLowStock
                        ? "border-amber-200 bg-amber-50/20 dark:bg-amber-950/10"
                        : "hover:border-emerald-300"
                    }`}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {product.category}
                        </span>
                        {/* Live Stock & Days-left badge */}
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Out of Stock
                          </Badge>
                        ) : product.isLowStock ? (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {product.stockQty} left
                            {product.daysLeft !== null && ` (~${product.daysLeft}d)`}
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600/10 text-emerald-700 border-emerald-300 text-[10px]">
                            {product.stockQty} in stock
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm font-bold line-clamp-1 mt-1">
                        {product.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-1 space-y-3">
                      <div className="flex justify-between items-baseline">
                        <span className="text-base font-extrabold text-foreground">
                          ₹{product.price.toLocaleString("en-IN")}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRestockItem(product)}
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                          title="Restock this item"
                        >
                          <PackagePlus className="h-3.5 w-3.5 mr-1" />
                          Restock
                        </Button>
                      </div>

                      <Button
                        size="sm"
                        disabled={isOutOfStock || cartQty >= product.stockQty}
                        onClick={() => addToCart(product)}
                        className={`w-full text-xs font-semibold ${
                          cartQty > 0
                            ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                            : ""
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

            {filteredInventory.length === 0 && (
              <div className="text-center p-12 bg-muted/30 rounded-xl border border-dashed">
                <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-muted-foreground">
                  No products found matching &ldquo;{searchQuery}&rdquo;.
                </p>
              </div>
            )}
          </div>

          {/* Checkout / Cart Panel (4 cols) */}
          <div className="lg:col-span-4">
            <Card className="sticky top-20 shadow-md border-emerald-600/20">
              <CardHeader className="p-4 border-b bg-muted/40">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-600" />
                    POS Sale Checkout
                  </CardTitle>
                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCart([])}
                      className="h-6 text-[10px] text-destructive hover:bg-destructive/10"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Member Lookup or Walk-in */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Customer Lookup
                  </label>
                  <select
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 focus:ring-1 focus:ring-emerald-600"
                    value={selectedMemberId}
                    onChange={(e) => {
                      setSelectedMemberId(e.target.value);
                      if (e.target.value) setGuestName("");
                    }}
                  >
                    <option value="">Walk-in Guest (Standard Price)</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.membershipNo}) - {m.planName} ({m.shopDiscountPct}% OFF)
                      </option>
                    ))}
                  </select>

                  {!selectedMemberId && (
                    <Input
                      placeholder="Walk-in Guest Name (Optional)"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="text-xs h-8"
                    />
                  )}

                  {selectedMember && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-md border border-emerald-200 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-emerald-900 dark:text-emerald-300">
                          {selectedMember.name}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400">
                          {selectedMember.planName} Privilege
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[10px]">
                        {selectedMember.shopDiscountPct}% Member Discount
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Cart Line Items */}
                <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      Scan or click products on the left to add to sale.
                    </div>
                  ) : (
                    cart.map((item) => {
                      const itemDiscount = (item.product.price * discountPct) / 100;
                      const unitNet = item.product.price - itemDiscount;

                      return (
                        <div
                          key={item.productId}
                          className="p-2.5 flex justify-between items-center gap-2 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{item.product.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              ₹{unitNet.toLocaleString("en-IN")}{" "}
                              {discountPct > 0 && (
                                <span className="line-through text-[10px]">
                                  ₹{item.product.price}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.productId, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-5 text-center font-bold text-xs">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              disabled={item.quantity >= item.product.stockQty}
                              onClick={() => updateQuantity(item.productId, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFromCart(item.productId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Totals Breakdown */}
                <div className="bg-muted/40 p-3 rounded-lg space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gross Subtotal</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  {discountPct > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Member Discount ({discountPct}%)</span>
                      <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-sm border-t pt-1.5 mt-1 text-foreground">
                    <span>Net Payable</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      ₹{netTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["CARD", "UPI", "CASH", "ONLINE"] as const).map((method) => (
                      <Button
                        key={method}
                        type="button"
                        variant={paymentMethod === method ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaymentMethod(method)}
                        className="text-xs font-semibold h-8"
                      >
                        {method}
                      </Button>
                    ))}
                  </div>
                </div>

                {orderError && (
                  <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-start gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{orderError}</span>
                  </div>
                )}

                {/* Complete Sale Action */}
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow"
                  disabled={cart.length === 0 || submittingOrder}
                  onClick={handleCheckout}
                >
                  {submittingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Deducting Stock & Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete Sale (₹{netTotal.toLocaleString("en-IN")})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW 2: ORDER DISPATCH MANAGEMENT */}
      {activeTab === "orders" && (
        <Card className="shadow-sm">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              Pro Shop Orders & Fulfillment
            </CardTitle>
            <CardDescription className="text-xs">
              Unified queue of counter POS receipts and online member pickup/delivery requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Order #</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-xs text-muted-foreground">
                      No shop orders recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((o) => (
                    <TableRow key={o.id} className="text-xs">
                      <TableCell className="font-mono font-semibold">{o.id.slice(-6).toUpperCase()}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(o.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={o.channel === "COUNTER" ? "secondary" : "default"} className="text-[10px]">
                          {o.channel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {o.fulfilment}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{o.customerName}</TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                      </TableCell>
                      <TableCell className="text-right font-bold text-foreground">
                        ₹{o.totalAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] ${
                            o.status === "COMPLETED"
                              ? "bg-emerald-600 text-white"
                              : o.status === "PENDING"
                              ? "bg-amber-500 text-white"
                              : "bg-destructive text-white"
                          }`}
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {o.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] text-emerald-700 hover:bg-emerald-50"
                              disabled={updatingOrderId === o.id}
                              onClick={() => handleOrderStatusChange(o.id, "COMPLETED")}
                            >
                              Ready / Collected
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] text-destructive hover:bg-destructive/10"
                              disabled={updatingOrderId === o.id}
                              onClick={() => handleOrderStatusChange(o.id, "CANCELLED")}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {o.status !== "PENDING" && (
                          <span className="text-[11px] text-muted-foreground">Settled</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* VIEW 3: COURT GEAR-UP QUEUE */}
      {activeTab === "gear-up" && (
        <Card className="shadow-sm">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              Court Equipment & Gear-Up Delivery Queue
            </CardTitle>
            <CardDescription className="text-xs">
              Today&apos;s upcoming court sessions requiring quick delivery of balls, grips, or racket stringing. Sorted by start time.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {gearUpQueue.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <Truck className="h-8 w-8 mx-auto mb-2 opacity-40 text-emerald-600" />
                No active court delivery requests for upcoming sessions today.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gearUpQueue.map((item) => (
                  <Card key={item.bookingId} className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10">
                    <CardHeader className="p-3 pb-2">
                      <div className="flex justify-between items-start">
                        <Badge className="bg-emerald-700 text-white text-[10px]">
                          {item.courtName}
                        </Badge>
                        <span className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <CardTitle className="text-sm font-semibold mt-1">
                        {item.playerName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      <div className="text-xs border-t pt-2 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Gear Needed at Court:
                        </span>
                        {item.neededOrders.map((ord, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-medium border-b pb-1">
                            <span>{ord.items}</span>
                            <span className="font-bold text-emerald-700">₹{ord.totalAmount}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: RESTOCK DIALOG */}
      {restockItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl animate-in fade-in-50">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <PackagePlus className="h-5 w-5 text-emerald-600" />
                  Restock Inventory
                </CardTitle>
                <CardDescription className="text-xs">{restockItem.name}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setRestockItem(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center text-xs bg-muted/50 p-2.5 rounded-lg">
                <span className="text-muted-foreground">Current Stock Quantity:</span>
                <span className="font-bold text-foreground text-sm">{restockItem.stockQty} units</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Quantity to Add into Shared Stock</label>
                <Input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="text-base font-bold"
                />
                <p className="text-[11px] text-muted-foreground">
                  New total stock will become:{" "}
                  <strong>
                    {restockItem.stockQty + (parseInt(restockQty, 10) || 0)} units
                  </strong>
                  . An immutable AuditLog entry will be recorded.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setRestockItem(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  disabled={restocking || !restockQty || parseInt(restockQty, 10) <= 0}
                  onClick={handleRestockSubmit}
                >
                  {restocking ? "Updating Stock..." : "Confirm Restock"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 2: PRINTABLE RECEIPT VIEW */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl bg-white text-slate-900 border-2">
            <CardHeader className="p-6 border-b text-center relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 h-7 w-7 text-slate-500"
                onClick={() => setReceiptData(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="h-10 w-10 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center mb-2">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">THE CHAMPIONS CLUB</h2>
              <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                Official Pro Shop Receipt
              </p>
              <div className="text-[10px] font-mono text-slate-400 mt-1">
                Ref: #{receiptData.orderId} • {new Date(receiptData.createdAt).toLocaleString()}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-800">{receiptData.customerName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Payment Method:</span>
                <Badge variant="outline" className="font-bold">
                  {receiptData.paymentMethod}
                </Badge>
              </div>

              {/* Items */}
              <div className="space-y-2 border-b pb-3">
                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                {receiptData.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{it.name}</span>
                      <span className="text-slate-400 text-[10px] ml-1.5">x{it.quantity}</span>
                    </div>
                    <span className="font-mono font-medium">₹{it.total.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>₹{receiptData.subtotal.toLocaleString("en-IN")}</span>
                </div>
                {receiptData.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Member Privilege Discount:</span>
                    <span>-₹{receiptData.discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm border-t pt-2 text-slate-900">
                  <span>Total Paid:</span>
                  <span className="text-emerald-700">₹{receiptData.netTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-1.5" />
                  Print Receipt
                </Button>
                <Button
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                  onClick={() => setReceiptData(null)}
                >
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
