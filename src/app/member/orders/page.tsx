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

  // Pure Database Query: Orders placed by this member
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
    <div className="max-w-5xl mx-auto space-y-8 text-[#1B1B1B]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B1B1B]">
            My Pro Shop <span className="text-[#5F9E4A]">orders</span>
          </h1>
          <p className="text-xs text-[#1B1B1B]/70 mt-1">
            Track equipment purchases, court-side delivery, and order status.
          </p>
        </div>

        <Link
          href="/member/shop"
          className="inline-flex items-center gap-2 px-6 h-11 rounded-full font-bold text-xs tracking-wider uppercase bg-[#1B1B1B] text-[#F6F5E1] hover:bg-black transition-all shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Browse Pro Shop</span>
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-[28px] p-12 bg-white border border-[#1B1B1B]/15 text-center space-y-4 shadow-sm">
          <Package className="h-12 w-12 text-[#5F9E4A] mx-auto opacity-80" />
          <h3 className="text-xl font-bold tracking-tight text-[#1B1B1B]">
            NO ORDERS PLACED YET
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Explore our tournament rackets, premium grips, apparel, and nutrition in the Pro Shop.
          </p>
          <Link
            href="/member/shop"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider bg-[#1B1B1B] text-[#F6F5E1]"
          >
            <span>Start Shopping</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-[24px] p-6 bg-white border border-[#1B1B1B]/15 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1B1B1B]/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#1B1B1B]">
                      Order #{o.id.slice(-8).toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        o.status === "COMPLETED"
                          ? "bg-[#5F9E4A]/15 text-[#3F7A37]"
                          : o.status === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    Placed on {new Date(o.createdAt).toLocaleDateString()} at{" "}
                    {new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-gray-400 block">Total</span>
                    <span className="text-base font-extrabold text-[#5F9E4A]">
                      ₹{Number(o.totalAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-[#1B1B1B]/10 text-xs">
                {o.items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#1B1B1B]">{item.product.name}</div>
                      <div className="text-[11px] text-gray-400">
                        Qty: {item.quantity} × ₹{Number(item.priceSnapshot).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="font-mono font-medium text-[#1B1B1B]">
                      ₹{(item.quantity * Number(item.priceSnapshot)).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-[#1B1B1B]/10">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-[#5F9E4A]" />
                  <span>Fulfilment: <strong>{o.fulfilment}</strong></span>
                </div>
                <span>Method: <strong>{o.channel}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
