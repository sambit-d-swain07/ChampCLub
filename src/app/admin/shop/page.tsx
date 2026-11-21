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

  // 1. Fetch live inventory with 14-day velocity & days-left run rate
  const inventory = await getShopInventory();

  // 2. Fetch members with active plans for live discount resolution
  const membersData = await prisma.member.findMany({
    include: {
      user: true,
      memberships: {
        where: { endsAt: { gte: new Date() } },
        include: { plan: true },
        orderBy: { endsAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const members = membersData.map((m: any) => {
    const activePlan = m.memberships[0]?.plan;
    return {
      id: m.id,
      membershipNo: m.membershipNo,
      name: m.user?.name || `Member ${m.membershipNo}`,
      planName: activePlan?.name || "Standard",
      shopDiscountPct: activePlan ? Number(activePlan.shopDiscountPct) : 0,
    };
  });

  // 3. Fetch recent shop orders
  const ordersData = await prisma.shopOrder.findMany({
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
  });

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

  // 4. Fetch gear-up court delivery queue
  const gearUpQueueData = await getCourtGearUpQueue();
  const gearUpQueue = gearUpQueueData.map((g) => ({
    ...g,
    startsAt: g.startsAt.toISOString(),
  }));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <StaffPos
        inventory={inventory}
        members={members}
        recentOrders={recentOrders}
        gearUpQueue={gearUpQueue}
      />
    </div>
  );
}
