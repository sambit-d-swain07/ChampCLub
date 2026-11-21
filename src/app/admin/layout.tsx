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
        <header className="h-14 border-b border-[#E5E7EB] bg-white hidden md:flex items-center justify-end px-8 sticky top-0 z-20">
          <span className="text-xs text-[#64748B]">Welcome, <strong className="text-[#0F172A] font-semibold">{user.name}</strong></span>
        </header>

        {/* Content canvas (max-width 1280px with 24px padding) */}
        <main className="p-6 md:p-8 flex-1 overflow-auto max-w-[1280px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
