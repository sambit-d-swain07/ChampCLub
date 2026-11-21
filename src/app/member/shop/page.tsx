import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { getShopProductsPaginated } from "@/lib/services/shop";
import { MemberShop } from "@/components/shop/member-shop";

export const dynamic = "force-dynamic";

export default async function MemberShopPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const query = params.q || "";
  const category = params.category || "ALL";

  const member = (await prisma.member.findUnique({
    where: { userId: user.id },
    include: {
      memberships: {
        where: { endsAt: { gte: new Date() } },
        include: { plan: true },
        orderBy: { endsAt: "desc" },
        take: 1,
      },
    },
  })) as any;

  if (!member) {
    redirect("/login");
  }

  // Resolve dynamic entitlement discount and fetch paginated products in parallel
  const [entitlement, paginatedData, pastOrdersData] = await Promise.all([
    resolve(member.id, new Date()),
    getShopProductsPaginated({
      page,
      limit: 9,
      query,
      category,
    }),
    prisma.shopOrder.findMany({
      where: { memberId: member.id },
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const activePlanName = member.memberships[0]?.plan?.name || "Standard";

  const pastOrders = pastOrdersData.map((o) => ({
    id: o.id,
    createdAt: o.createdAt.toISOString(),
    fulfilment: o.fulfilment as "PICKUP" | "DELIVERY" | "COURT",
    status: o.status as string,
    totalAmount: Number(o.totalAmount),
    items: o.items.map((it) => ({
      name: it.product.name,
      quantity: it.quantity,
      price: Number(it.priceSnapshot) - Number(it.discountSnapshot),
    })),
  }));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <MemberShop
        products={paginatedData.products}
        totalProducts={paginatedData.total}
        currentPage={paginatedData.page}
        totalPages={paginatedData.totalPages}
        categories={paginatedData.categories}
        currentQuery={query}
        currentCategory={category}
        discountPct={entitlement.shopDiscountPct}
        planName={activePlanName}
        pastOrders={pastOrders}
      />
    </div>
  );
}
