import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getTablesWithActiveTabs, getBarMenuItems } from "@/lib/services/bar";
import { StaffBar } from "@/components/bar/staff-bar";

export const dynamic = "force-dynamic";

export default async function AdminBarPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
    redirect("/login");
  }

  // Fetch tables with active tabs and menu items in parallel
  const [tables, menuItems] = await Promise.all([
    getTablesWithActiveTabs(),
    getBarMenuItems(),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <StaffBar
        tables={tables}
        menuItems={menuItems}
      />
    </div>
  );
}
