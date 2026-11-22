"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { placeOnlineOrderAction } from "@/app/actions/shop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { formatInrPrecise } from "@/lib/site-settings";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Search,
  Loader2,
  X,
} from "lucide-react";

export interface ShopProduct {
  id: string;
  sku?: string;
  name: string;
  category: string;
  price: number;
  stockQty: number;
  isLowStock?: boolean;
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
  totalProducts: number;
  currentPage: number;
  totalPages: number;
  categories: string[];
  currentQuery?: string;
  currentCategory?: string;
  discountPct: number;
  planName: string;
  pastOrders: MemberPastOrder[];
}

export function MemberShop({
  products,
  totalProducts,
  currentPage,
  totalPages,
  categories,
  currentQuery = "",
  currentCategory = "ALL",
  discountPct,
  planName,
  pastOrders,
}: MemberShopProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"catalog" | "orders">("catalog");
  const [cart, setCart] = useState<Array<{ product: ShopProduct; quantity: number }>>([]);
  const [fulfilment, setFulfilment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");

  // Search input state with 300ms debounce
  const [searchInput, setSearchInput] = useState(currentQuery);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(currentQuery);
  }, [currentQuery]);

  const navigateWithFilters = (q: string, cat: string, page = 1) => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", page.toString());
    if (q.trim()) params.set("q", q.trim());
    if (cat && cat !== "ALL") params.set("category", cat);
    router.push(`/member/shop?${params.toString()}`);
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
    if (cart.length === 0 || isSubmitting) return;

    if (fulfilment === "DELIVERY" && (!deliveryAddress || !deliveryAddress.trim())) {
      setErrorMsg("Delivery address or court number is compulsory for delivery orders.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const clientRequestId = "req_m_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);

    const res = await placeOnlineOrderAction({
      items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      fulfilment,
      deliveryAddress: fulfilment === "DELIVERY" ? deliveryAddress : null,
      paymentMethod,
      clientRequestId,
    });

    setIsSubmitting(false);

    if (!res.success || !("order" in res) || !res.order) {
      // Keep cart intact on failure!
      setErrorMsg(res.error || "Payment did not go through. Please try again.");
      return;
    }

    setOrderSuccess(res.order);
    setCart([]);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">Pro Shop</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Racquet gear, strings, apparel and balls delivered to court or pickup at front desk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {discountPct > 0 && (
            <span className="text-xs font-semibold text-[#23513C] bg-[#23513C]/10 px-2.5 py-1 rounded">
              {planName} Member: {discountPct}% off
            </span>
          )}
          <Button
            size="sm"
            variant={activeTab === "catalog" ? "default" : "outline"}
            onClick={() => setActiveTab("catalog")}
            className={activeTab === "catalog" ? "bg-[#23513C] text-white hover:bg-[#1b402f] text-xs" : "text-xs"}
          >
            Equipment Catalog
          </Button>
          <Button
            size="sm"
            variant={activeTab === "orders" ? "default" : "outline"}
            onClick={() => setActiveTab("orders")}
            className={activeTab === "orders" ? "bg-[#23513C] text-white hover:bg-[#1b402f] text-xs" : "text-xs"}
          >
            My Orders ({pastOrders.length})
          </Button>
        </div>
      </div>

      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Catalog & Search (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Search and Category Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
                <Input
                  placeholder="Search products..."
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

            {/* 3x3 Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const cartItem = cart.find((i) => i.product.id === product.id);
                const cartQty = cartItem ? cartItem.quantity : 0;
                const isOutOfStock = product.stockQty <= 0;
                const discountedPrice =
                  discountPct > 0
                    ? product.price - (product.price * discountPct) / 100
                    : product.price;

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
                        ) : (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            In stock
                          </span>
                        )}
                      </div>
                      <CardTitle
                        className="text-sm font-semibold font-sans text-[#0F172A] line-clamp-1 mt-1"
                        style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
                      >
                        {product.name}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="p-4 pt-0 space-y-3">
                      <div>
                        {discountPct > 0 ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-[#0F172A]">
                              {formatInrPrecise(discountedPrice)}
                            </span>
                            <span className="text-xs text-[#94A3B8] line-through">
                              {formatInrPrecise(product.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-[#0F172A]">
                            {formatInrPrecise(product.price)}
                          </span>
                        )}
                      </div>

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
                        {cartQty > 0 ? `In Cart (${cartQty})` : "Add to Cart"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {products.length === 0 && (
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

          {/* Cart & Checkout Panel (4 cols) */}
          <div className="lg:col-span-4">
            <Card className="sticky top-20 shadow-none border border-[#E2E8F0] bg-white">
              <CardHeader className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <div className="flex justify-between items-center">
                  <CardTitle
                    className="text-sm font-semibold font-sans text-[#0F172A]"
                    style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
                  >
                    Your Cart ({cart.reduce((acc, i) => acc + i.quantity, 0)})
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
                {cart.length === 0 ? (
                  <div className="text-xs text-[#64748B] py-8 text-center border border-dashed border-[#E2E8F0] rounded">
                    Your cart is empty. Add equipment from the catalog to order.
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-[#F1F5F9] max-h-56 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div key={item.product.id} className="py-2 flex items-center justify-between text-xs">
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
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="w-6 h-6 rounded border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC]"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center font-semibold text-[#0F172A]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, 1)}
                              disabled={item.quantity >= item.product.stockQty}
                              className="w-6 h-6 rounded border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="w-6 h-6 flex items-center justify-center text-red-500 hover:text-red-700 ml-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Fulfilment Option */}
                    <div className="space-y-2 border-t border-[#E2E8F0] pt-3">
                      <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider block">
                        Fulfilment Method
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFulfilment("PICKUP")}
                          className={`h-8 text-xs font-semibold rounded transition-colors ${
                            fulfilment === "PICKUP"
                              ? "bg-[#23513C] text-white"
                              : "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          Club Pickup
                        </button>
                        <button
                          type="button"
                          onClick={() => setFulfilment("DELIVERY")}
                          className={`h-8 text-xs font-semibold rounded transition-colors ${
                            fulfilment === "DELIVERY"
                              ? "bg-[#23513C] text-white"
                              : "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          Delivery
                        </button>
                      </div>

                      {fulfilment === "DELIVERY" && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider flex items-center justify-between">
                            <span>Delivery Address / Court #</span>
                            <span className="text-red-500 font-bold">* Compulsory</span>
                          </label>
                          <Input
                            placeholder="Enter delivery address or court number..."
                            value={deliveryAddress}
                            onChange={(e) => {
                              setDeliveryAddress(e.target.value);
                              if (errorMsg) setErrorMsg(null);
                            }}
                            className="text-xs h-8 bg-white border-[#E2E8F0] focus:border-[#23513C]"
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* Payment Method */}
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

                    {/* Totals */}
                    <div className="space-y-1.5 border-t border-[#E2E8F0] pt-3 text-xs">
                      <div className="flex justify-between text-[#64748B]">
                        <span>Subtotal</span>
                        <span>{formatInrPrecise(grossSubtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>{planName} Member Discount ({discountPct}%)</span>
                          <span>-{formatInrPrecise(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-[#0F172A] pt-1 border-t border-[#F1F5F9]">
                        <span>Net Payable</span>
                        <span>{formatInrPrecise(netTotal)}</span>
                      </div>
                    </div>

                    {/* Friendly Error */}
                    {errorMsg && (
                      <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                        {errorMsg}
                      </div>
                    )}

                    {/* Place Order Button */}
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting}
                      className="w-full text-xs font-semibold h-10 bg-[#23513C] hover:bg-[#1b402f] text-white disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Placing order...
                        </span>
                      ) : (
                        `Place Order (${formatInrPrecise(netTotal)})`
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <Card className="shadow-none border border-[#E2E8F0] bg-white">
          <CardHeader className="p-4 border-b border-[#E2E8F0]">
            <CardTitle
              className="text-sm font-semibold font-sans text-[#0F172A]"
              style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}
            >
              Your Past Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {pastOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                You haven&apos;t placed any equipment orders yet.
              </div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {pastOrders.map((o) => (
                  <div key={o.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A]">
                        Order #{o.id.slice(-6).toUpperCase()} • {o.fulfilment}
                      </div>
                      <div className="text-[11px] text-[#64748B]">
                        {o.items.map((i) => `${i.name} (x${i.quantity})`).join(", ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#0F172A]">
                        {formatInrPrecise(o.totalAmount)}
                      </div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 space-y-4 border border-[#E2E8F0] text-center">
            <CheckCircle2 className="h-8 w-8 text-[#23513C] mx-auto" />
            <h2 className="text-sm font-bold text-[#0F172A]">Order Placed Successfully!</h2>
            <p className="text-xs text-[#64748B]">
              Your order has been recorded. You can collect it at the club desk or expect delivery to your court.
            </p>
            <Button
              size="sm"
              onClick={() => setOrderSuccess(null)}
              className="w-full text-xs bg-[#23513C] text-white hover:bg-[#1b402f]"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
