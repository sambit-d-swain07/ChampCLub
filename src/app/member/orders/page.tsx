import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ShoppingBag, ArrowRight, Package, CheckCircle2, Clock, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MemberOrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const member = await prisma.member.findUnique({
    where: { userId: user.id },
  });

  if (!member) {
    redirect("/login");
  }

  const orders = await prisma.shopOrder.findMany({
    where: { memberId: member.id },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl font-display uppercase tracking-wider text-[#F4F1EA]">
            MY PRO SHOP <span className="font-serif italic lowercase text-[#C8F13A] font-normal">orders</span>
          </h1>
          <p className="text-xs text-[#F4F1EA]/70 mt-1">
            Track equipment purchases, court-side delivery, and order status.
          </p>
        </div>

        <Link
          href="/member/shop"
          className="inline-flex items-center gap-2 px-6 h-11 rounded-full font-bold text-xs tracking-wider uppercase bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] transition-all shadow-md self-start sm:self-auto cursor-pointer"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Browse Pro Shop</span>
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-3xl p-12 bg-[#0E4433] border border-white/10 text-center space-y-4">
          <Package className="h-12 w-12 text-[#C8F13A] mx-auto opacity-80" />
          <h3 className="text-2xl font-display uppercase tracking-wider text-[#F4F1EA]">
            NO ORDERS PLACED YET
          </h3>
          <p className="text-xs text-[#F4F1EA]/60 max-w-md mx-auto">
            Get tournament-ready with Yonex shuttlecocks, Head racquets, and court-side delivery at member discount rates.
          </p>
          <Link
            href="/member/shop"
            className="inline-block px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider bg-[#C8F13A] text-[#07271D]"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isCompleted = order.status === "COMPLETED";
            const isCancelled = order.status === "CANCELLED";

            return (
              <div
                key={order.id}
                className="rounded-3xl p-6 bg-[#0E4433] border border-white/10 shadow-lg space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-2">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-[#F4F1EA]">
                        ORDER #{order.id.slice(-6).toUpperCase()}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[#F4F1EA]/80 flex items-center gap-1">
                        <Truck className="h-3 w-3" /> {order.fulfilment}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#F4F1EA]/60 mt-0.5">
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })} at{" "}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : isCancelled
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : "bg-[#C8F13A]/20 text-[#C8F13A] border border-[#C8F13A]/30"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="text-lg font-bold text-[#C8F13A]">
                      ₹{Number(order.totalAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-white/5 text-xs">
                  {order.items.map((item) => {
                    const unitPrice = Math.max(0, Number(item.priceSnapshot) - Number(item.discountSnapshot));
                    const lineTotal = unitPrice * item.quantity;
                    return (
                      <div key={item.id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#F4F1EA]">{item.product.name}</span>
                          <span className="text-[#F4F1EA]/50 font-mono">× {item.quantity}</span>
                        </div>
                        <div className="font-medium text-[#F4F1EA]">
                          ₹{lineTotal.toLocaleString("en-IN")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
