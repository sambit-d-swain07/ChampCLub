import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatClubDate, formatClubTime } from "@/lib/site-settings";

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

  // Pure Database Query: Orders placed by this member (paginated 20 rows)
  const orders = await prisma.shopOrder.findMany({
    where: { memberId: member.id },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-[#15201A]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight text-[#15201A]">Orders</h1>
        <Link
          href="/member/shop"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs bg-[#23513C] text-white hover:bg-[#1a3d2d] transition-colors self-start sm:self-auto"
        >
          Browse Pro Shop
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl p-8 bg-white border border-[#D9D5C9] text-center">
          <p className="text-sm text-[#55605A]">No orders placed yet.</p>
          <Link
            href="/member/shop"
            className="mt-3 inline-block px-4 py-2 rounded-lg font-semibold text-xs bg-[#23513C] text-white hover:bg-[#1a3d2d] transition-colors"
          >
            Browse Pro Shop
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-xl p-5 bg-white border border-[#D9D5C9] space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9D5C9] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#15201A]">
                      #{o.id.slice(-8).toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        o.status === "COMPLETED"
                          ? "bg-green-50 text-green-700"
                          : o.status === "PENDING"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#55605A] mt-1">
                    {formatClubDate(o.createdAt)} · {formatClubTime(o.createdAt)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-bold text-[#15201A]">
                    ₹{Number(o.totalAmount).toLocaleString("en-IN")}
                  </span>
                  <div className="text-[11px] text-[#55605A]">{o.fulfilment}</div>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y divide-[#D9D5C9] text-xs">
                {o.items.map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#15201A]">{item.product.name}</div>
                      <div className="text-[#55605A]">
                        {item.quantity} × ₹{Number(item.priceSnapshot).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="font-medium text-[#15201A]">
                      ₹{(item.quantity * Number(item.priceSnapshot)).toLocaleString("en-IN")}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1 text-xs text-[#55605A]">
                Via {o.channel}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
