import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { MemberShop } from "@/components/shop/member-shop";

export const dynamic = "force-dynamic";

export default async function MemberShopPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

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

  // Resolve dynamic entitlement discount
  const entitlement = await resolve(member.id, new Date());
  const activePlanName = member.memberships[0]?.plan.name || "Standard";

  // Fetch all products
  const productsData = await prisma.product.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const products = productsData.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    stockQty: p.stockQty,
  }));

  // Fetch member's past shop orders
  const pastOrdersData = await prisma.shopOrder.findMany({
    where: { memberId: member.id },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const pastOrders = pastOrdersData.map((o) => ({
    id: o.id,
    createdAt: o.createdAt.toISOString(),
    fulfilment: o.fulfilment,
    status: o.status,
    totalAmount: Number(o.totalAmount),
    items: o.items.map((it) => ({
      name: it.product.name,
      quantity: it.quantity,
      price: Number(it.priceSnapshot) - Number(it.discountSnapshot),
    })),
  }));

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <MemberShop
        products={products}
        discountPct={entitlement.shopDiscountPct}
        planName={activePlanName}
        pastOrders={pastOrders}
      />
    </div>
  );
}
