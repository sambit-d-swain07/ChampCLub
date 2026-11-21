import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getShopProductsPaginated, getCourtGearUpQueue } from "@/lib/services/shop";
import { StaffPos } from "@/components/shop/staff-pos";

export const dynamic = "force-dynamic";

export default async function AdminShopPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const query = params.q || "";
  const category = params.category || "ALL";

  // 1. Parallelize independent queries: paginated inventory, recent orders, gear-up queue
  const [paginatedData, ordersData, gearUpQueueData] = await Promise.all([
    getShopProductsPaginated({
      page,
      limit: 9,
      query,
      category,
    }),
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <StaffPos
        inventory={paginatedData.products}
        totalProducts={paginatedData.total}
        currentPage={paginatedData.page}
        totalPages={paginatedData.totalPages}
        categories={paginatedData.categories}
        currentQuery={query}
        currentCategory={category}
        recentOrders={recentOrders}
        gearUpQueue={gearUpQueue}
      />
    </div>
  );
}
