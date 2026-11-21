import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const role = (user as { role?: string }).role || "MEMBER";

  if (role === "MEMBER") {
    redirect("/member");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar user={{ id: user.id, name: user.name, email: user.email, role }} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Sports & Club Operations</span>
            <span className="text-xs text-muted-foreground">/ Live View</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              System Live
            </span>
            <span>Welcome, {user.name}</span>
          </div>
        </header>
        <main className="p-8 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
