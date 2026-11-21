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
    <div className="admin-portal min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col md:flex-row antialiased">
      <AdminSidebar user={{ id: user.id, name: user.name, email: user.email, role }} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 border-b border-[#E5E7EB] bg-white hidden md:flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-[#0F172A]">Sports Club Operations</span>
            <span className="text-xs text-[#64748B]">/ Control Center</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#64748B]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync Active
            </span>
            <span>Welcome, <strong className="text-[#0F172A]">{user.name}</strong></span>
          </div>
        </header>

        {/* Content canvas (max-width 1280px with 24px padding) */}
        <main className="p-6 md:p-8 flex-1 overflow-auto max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
