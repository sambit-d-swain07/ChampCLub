import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getKitchenOrders } from "@/lib/services/bar";
import { KitchenBoard } from "@/components/bar/kitchen-board";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
    redirect("/login");
  }

  const initialOrders = await getKitchenOrders();

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-slate-950/5">
      <KitchenBoard initialOrders={initialOrders} />
    </div>
  );
}
