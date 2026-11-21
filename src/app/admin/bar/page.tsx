import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getTablesWithActiveTabs, getBarMenuItems } from "@/lib/services/bar";
import { StaffBar } from "@/components/bar/staff-bar";

export const dynamic = "force-dynamic";

export default async function AdminBarPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
    redirect("/login");
  }

  // 1. Fetch tables with active tabs and balance
  const tables = await getTablesWithActiveTabs();

  // 2. Fetch bar menu items
  const menuItems = await getBarMenuItems();

  // 3. Fetch active members for live bar discount resolution
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

  const members = membersData.map((m) => {
    const activePlan = m.memberships[0]?.plan;
    return {
      id: m.id,
      membershipNo: m.membershipNo,
      name: m.user?.name || `Member ${m.membershipNo}`,
      planName: activePlan?.name || "Standard",
      barDiscountPct: activePlan ? Number(activePlan.barDiscountPct) : 0,
    };
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <StaffBar
        tables={tables}
        menuItems={menuItems}
        members={members}
      />
    </div>
  );
}
