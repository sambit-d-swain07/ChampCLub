"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { placeOnlineOrderAction } from "@/app/actions/shop";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Truck,
  Sparkles,
  Package,
  Layers,
  Clock,
  Loader2,
  X,
} from "lucide-react";

export interface ShopProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQty: number;
}

export interface MemberPastOrder {
  id: string;
  createdAt: string;
  fulfilment: "PICKUP" | "DELIVERY" | "COURT";
  status: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface MemberShopProps {
  products: ShopProduct[];
  discountPct: number;
  planName: string;
  pastOrders: MemberPastOrder[];
}

export function MemberShop({
  products,
  discountPct,
  planName,
  pastOrders: initialPastOrders,
}: MemberShopProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"catalog" | "orders">("catalog");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [cart, setCart] = useState<Array<{ product: ShopProduct; quantity: number }>>([]);
  const [fulfilment, setFulfilment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categories = ["ALL", ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    return selectedCategory === "ALL" || p.category === selectedCategory;
  });

  const addToCart = (product: ShopProduct) => {
    const existing = cart.find((i) => i.product.id === product.id);
    const curQty = existing ? existing.quantity : 0;
    if (curQty >= product.stockQty) return;

    if (existing) {
      setCart(
        cart.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.product.id === productId) {
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
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  // Financials
  const grossSubtotal = cart.reduce(
    (acc, i) => acc + i.product.price * i.quantity,
    0
  );
  const discountAmount = (grossSubtotal * discountPct) / 100;
  const netTotal = Math.max(0, grossSubtotal - discountAmount);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await placeOnlineOrderAction({
      items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      fulfilment,
      deliveryAddress: fulfilment === "DELIVERY" ? deliveryAddress : null,
      paymentMethod,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || "Failed to place order.");
      return;
    }

    setOrderSuccess({
      orderId: res.order?.id || "ORD-" + Math.floor(1000 + Math.random() * 9000),
      total: netTotal,
      fulfilment,
    });
    setCart([]);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/member">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              Champions Pro Shop
            </h1>
            <p className="text-xs text-muted-foreground">
              Official club gear, stringing, grips & balls delivered to court or ready for desk pickup.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {discountPct > 0 && (
            <Badge className="bg-emerald-600/10 text-emerald-700 border-emerald-300 text-xs py-1 px-2.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {planName} Member: {discountPct}% OFF
            </Badge>
          )}

          <div className="flex bg-muted p-1 rounded-lg">
            <Button
              variant={activeTab === "catalog" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("catalog")}
              className="text-xs font-semibold"
            >
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Browse Gear
            </Button>
            <Button
              variant={activeTab === "orders" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("orders")}
              className="text-xs font-semibold"
            >
              <Layers className="h-3.5 w-3.5 mr-1.5" />
              My Orders ({initialPastOrders.length})
            </Button>
          </div>
        </div>
      </div>

      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Products Grid (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Category Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="text-xs font-semibold whitespace-nowrap"
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Catalog Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const itemDiscount = (p.price * discountPct) / 100;
                const netPrice = p.price - itemDiscount;
                const inCart = cart.find((i) => i.product.id === p.id);
                const cartQty = inCart ? inCart.quantity : 0;
                const isOutOfStock = p.stockQty <= 0;

                return (
                  <Card key={p.id} className="overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          {p.category}
                        </span>
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Out of Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
                            In Stock
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-sm font-bold mt-1 line-clamp-1">{p.name}</CardTitle>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-extrabold text-foreground">
                            ₹{netPrice.toLocaleString("en-IN")}
                          </span>
                          {discountPct > 0 && (
                            <span className="text-xs line-through text-muted-foreground">
                              ₹{p.price.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {discountPct > 0 && (
                          <span className="text-[10px] text-emerald-600 font-semibold block">
                            Save ₹{itemDiscount.toLocaleString("en-IN")} with {planName}
                          </span>
                        )}
                      </div>

                      <Button
                        size="sm"
                        disabled={isOutOfStock || cartQty >= p.stockQty}
                        onClick={() => addToCart(p)}
                        className={`w-full text-xs font-semibold ${
                          cartQty > 0 ? "bg-emerald-700 hover:bg-emerald-800 text-white" : ""
                        }`}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {cartQty > 0 ? `In Bag (${cartQty})` : "Add to Bag"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Cart & Checkout Panel (4 cols) */}
          <div className="lg:col-span-4">
            <Card className="sticky top-20 shadow-md border-emerald-600/20">
              <CardHeader className="p-4 border-b bg-muted/30">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-emerald-600" />
                    Shopping Bag ({cart.reduce((a, b) => a + b.quantity, 0)})
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
                {/* Cart list */}
                <div className="border rounded-md divide-y max-h-56 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      Your bag is empty. Select items to add them.
                    </div>
                  ) : (
                    cart.map((item) => {
                      const netUnit = item.product.price - (item.product.price * discountPct) / 100;

                      return (
                        <div
                          key={item.product.id}
                          className="p-2.5 flex justify-between items-center gap-2 text-xs"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{item.product.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              ₹{netUnit.toLocaleString("en-IN")} each
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.product.id, -1)}
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
                              onClick={() => updateQuantity(item.product.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Fulfillment selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Fulfillment Preference
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={fulfilment === "PICKUP" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFulfilment("PICKUP")}
                      className="text-xs h-8"
                    >
                      Pro Shop Pickup
                    </Button>
                    <Button
                      type="button"
                      variant={fulfilment === "DELIVERY" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFulfilment("DELIVERY")}
                      className="text-xs h-8"
                    >
                      Court / Lounge
                    </Button>
                  </div>
                </div>

                {fulfilment === "DELIVERY" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">
                      Delivery Location / Court #
                    </label>
                    <Input
                      placeholder="e.g. Court 3 (Session at 4:30 PM)"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                )}

                {/* Payment Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["CASH", "UPI", "CARD"] as const).map((method) => (
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

                {/* Breakdown */}
                <div className="bg-muted/40 p-3 rounded-lg space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₹{grossSubtotal.toLocaleString("en-IN")}</span>
                  </div>
                  {discountPct > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Privilege Discount ({discountPct}%)</span>
                      <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-sm border-t pt-1.5 mt-1 text-foreground">
                    <span>Total Amount</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      ₹{netTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-start gap-1.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 shadow"
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={handlePlaceOrder}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Securing Stock...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Place Order (₹{netTotal.toLocaleString("en-IN")})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW: PAST ORDERS */}
      {activeTab === "orders" && (
        <Card className="shadow-sm">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              My Pro Shop Order History
            </CardTitle>
            <CardDescription className="text-xs">
              Review your previous gear purchases and pickup status.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {initialPastOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40 text-emerald-600" />
                You haven&apos;t placed any Pro Shop orders yet.
              </div>
            ) : (
              initialPastOrders.map((o) => (
                <div
                  key={o.id}
                  className="p-3 rounded-lg border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">#{o.id.slice(-6).toUpperCase()}</span>
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
                      <Badge variant="outline" className="text-[10px]">
                        {o.fulfilment}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(o.createdAt).toLocaleString()} • {o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                    </p>
                  </div>

                  <div className="text-right sm:text-right font-bold text-sm text-foreground">
                    ₹{o.totalAmount.toLocaleString("en-IN")}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* SUCCESS MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl bg-white text-slate-900 border-2">
            <CardHeader className="p-6 text-center border-b">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-900">ORDER CONFIRMED!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Reference ID: <strong className="font-mono font-bold">#{orderSuccess.orderId}</strong>
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                {orderSuccess.fulfilment === "DELIVERY"
                  ? "Your equipment is queued for delivery directly to your court session. Staff will bring it over before match start."
                  : "Your equipment has been reserved and is ready for pickup at the Pro Shop front desk."}
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Total Paid:</span>
                <span className="font-bold text-sm text-slate-900">
                  ₹{orderSuccess.total.toLocaleString("en-IN")}
                </span>
              </div>

              <Button
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold"
                onClick={() => setOrderSuccess(null)}
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
