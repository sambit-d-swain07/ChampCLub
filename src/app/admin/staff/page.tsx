import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StaffManagement, StaffItem } from "@/components/admin/staff-management";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  // Strict role enforcement: OWNER only
  if (role !== "OWNER") {
    redirect("/admin/members");
  }

  // Fetch all staff accounts
  const staffUsers = await prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bannedAt: true,
      createdAt: true,
    },
  });

  const formattedStaff: StaffItem[] = staffUsers.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    bannedAt: s.bannedAt,
    createdAt: s.createdAt,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">Staff Operations & Roles</h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Manage club personnel, assign front desk and F&amp;B operational access, and add new staff members.
        </p>
      </div>

      <StaffManagement staffList={formattedStaff} title="Club Personnel" />
    </div>
  );
}
