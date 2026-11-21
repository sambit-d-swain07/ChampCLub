import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getShopInventory, getCourtGearUpQueue } from "@/lib/services/shop";
import { StaffPos } from "@/components/shop/staff-pos";

export const dynamic = "force-dynamic";

export default async function AdminShopPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
    redirect("/login");
  }

  // 1. Parallelize independent queries: inventory, recent orders, gear-up queue
  const [inventory, ordersData, gearUpQueueData] = await Promise.all([
    getShopInventory(),
    prisma.shopOrder.findMany({
      include: {
        items: {
          include: { product: true },
        },
        member: {
          include: { user: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getCourtGearUpQueue(),
  ]);

  const recentOrders = ordersData.map((o) => ({
    id: o.id,
    createdAt: o.createdAt.toISOString(),
    channel: o.channel as "COUNTER" | "ONLINE",
    fulfilment: o.fulfilment as "PICKUP" | "DELIVERY" | "COURT",
    status: o.status as string,
    totalAmount: Number(o.totalAmount),
    customerName: o.member?.user?.name || `Member ${o.member?.membershipNo || "Walk-in"}`,
    items: o.items.map((it) => ({
      name: it.product.name,
      quantity: it.quantity,
      price: Number(it.priceSnapshot) - Number(it.discountSnapshot),
    })),
  }));

  const gearUpQueue = gearUpQueueData.map((g) => ({
    ...g,
    startsAt: g.startsAt.toISOString(),
  }));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <StaffPos
        inventory={inventory}
        recentOrders={recentOrders}
        gearUpQueue={gearUpQueue}
      />
    </div>
  );
}
