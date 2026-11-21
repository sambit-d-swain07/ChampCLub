import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { InventoryManager, InventoryRowItem } from "@/components/admin/inventory-manager";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 15;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    category?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  if (!user || (role !== "OWNER" && role !== "STAFF")) {
    redirect("/login");
  }

  const params = await searchParams;
  const activeTab: "PRODUCT" | "BAR" = params.tab?.toLowerCase() === "bar" ? "BAR" : "PRODUCT";
  const query = params.q || "";
  const category = params.category || "";
  const status = params.status || "ALL";
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const skip = (page - 1) * PAGE_SIZE;

  // Build where conditions
  const buildWhere = (type: "PRODUCT" | "BAR") => {
    const where: any = {
      archivedAt: null,
      ...(query.trim()
        ? {
            OR: [
              { name: { contains: query.trim(), mode: "insensitive" } },
              { category: { contains: query.trim(), mode: "insensitive" } },
              { sku: { contains: query.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
      ...(category ? { category: { equals: category, mode: "insensitive" } } : {}),
    };

    if (status === "OUT_OF_STOCK") {
      where.stockQty = { lte: 0 };
    } else if (status === "IN_STOCK") {
      where.stockQty = { gt: 0 };
    }

    return where;
  };

  const where = buildWhere(activeTab);

  if (activeTab === "PRODUCT") {
    const [products, total, categoriesData, lowStockData] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: [{ category: "asc" }, { name: "asc" }],
        skip,
        take: PAGE_SIZE,
      }),
      prisma.product.count({ where }),
      prisma.product.findMany({
        where: { archivedAt: null },
        select: { category: true },
        distinct: ["category"],
      }),
      prisma.product.findMany({
        where: {
          archivedAt: null,
          stockQty: { lte: 10 },
        },
        orderBy: { stockQty: "asc" },
      }),
    ]);

    const formattedItems: InventoryRowItem[] = products.map((p) => {
      const price = Number(p.price);
      const cost = Number(p.costPrice || 0);
      const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0;
      const st: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" =
        p.stockQty <= 0 ? "OUT_OF_STOCK" : p.stockQty <= p.reorderLevel ? "LOW_STOCK" : "IN_STOCK";

      return {
        id: p.id,
        sku: p.sku || "PS-0000",
        name: p.name,
        category: p.category,
        price,
        costPrice: cost,
        stockQty: p.stockQty,
        reorderLevel: p.reorderLevel,
        marginPct,
        status: st,
      };
    });

    const formattedLowStock: InventoryRowItem[] = lowStockData
      .filter((p) => p.stockQty <= p.reorderLevel)
      .map((p) => {
        const price = Number(p.price);
        const cost = Number(p.costPrice || 0);
        const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0;
        return {
          id: p.id,
          sku: p.sku || "PS-0000",
          name: p.name,
          category: p.category,
          price,
          costPrice: cost,
          stockQty: p.stockQty,
          reorderLevel: p.reorderLevel,
          marginPct,
          status: p.stockQty <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
        };
      });

    return (
      <div className="space-y-6">
        <InventoryManager
          activeTab="PRODUCT"
          items={formattedItems}
          totalItems={total}
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          categories={Array.from(new Set(categoriesData.map((c) => c.category))).sort()}
          lowStockItems={formattedLowStock}
          currentQuery={query}
          currentCategory={category}
          currentStatus={status}
          isOwner={role === "OWNER"}
        />
      </div>
    );
  } else {
    // BAR
    const [barItems, total, categoriesData, lowStockData] = await Promise.all([
      prisma.barItem.findMany({
        where,
        orderBy: [{ category: "asc" }, { name: "asc" }],
        skip,
        take: PAGE_SIZE,
      }),
      prisma.barItem.count({ where }),
      prisma.barItem.findMany({
        where: { archivedAt: null },
        select: { category: true },
        distinct: ["category"],
      }),
      prisma.barItem.findMany({
        where: {
          archivedAt: null,
          stockQty: { lte: 25 },
        },
        orderBy: { stockQty: "asc" },
      }),
    ]);

    const formattedItems: InventoryRowItem[] = barItems.map((b) => {
      const price = Number(b.price);
      const cost = Number(b.costPrice || 0);
      const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0;
      const st: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" =
        b.stockQty <= 0 ? "OUT_OF_STOCK" : b.stockQty <= b.reorderLevel ? "LOW_STOCK" : "IN_STOCK";

      return {
        id: b.id,
        sku: b.sku || "BR-0000",
        name: b.name,
        category: b.category,
        price,
        costPrice: cost,
        stockQty: b.stockQty,
        reorderLevel: b.reorderLevel,
        marginPct,
        status: st,
      };
    });

    const formattedLowStock: InventoryRowItem[] = lowStockData
      .filter((b) => b.stockQty <= b.reorderLevel)
      .map((b) => {
        const price = Number(b.price);
        const cost = Number(b.costPrice || 0);
        const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0;
        return {
          id: b.id,
          sku: b.sku || "BR-0000",
          name: b.name,
          category: b.category,
          price,
          costPrice: cost,
          stockQty: b.stockQty,
          reorderLevel: b.reorderLevel,
          marginPct,
          status: b.stockQty <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
        };
      });

    return (
      <div className="space-y-6">
        <InventoryManager
          activeTab="BAR"
          items={formattedItems}
          totalItems={total}
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          categories={Array.from(new Set(categoriesData.map((c) => c.category))).sort()}
          lowStockItems={formattedLowStock}
          currentQuery={query}
          currentCategory={category}
          currentStatus={status}
          isOwner={role === "OWNER"}
        />
      </div>
    );
  }
}
