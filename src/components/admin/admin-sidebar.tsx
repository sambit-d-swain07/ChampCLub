"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ShoppingBag,
  Wine,
  ChefHat,
  Landmark,
  Receipt,
  BookOpen,
  LogOut,
  Trophy,
  Menu,
  X,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";

interface AdminSidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface NavSection {
  title: string;
  links: Array<{
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    roles: string[];
  }>;
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user.role;

  const sections: NavSection[] = [
    {
      title: "Overview",
      links: [
        { label: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["OWNER"] },
        { label: "Executive Finance", href: "/admin/owner", icon: Landmark, roles: ["OWNER"] },
      ],
    },
    {
      title: "Operations",
      links: [
        { label: "Courts & Bookings", href: "/admin/courts", icon: CalendarDays, roles: ["OWNER", "STAFF"] },
        { label: "Members", href: "/admin/members", icon: Users, roles: ["OWNER", "STAFF"] },
      ],
    },
    {
      title: "Commerce & F&B",
      links: [
        { label: "Pro Shop", href: "/admin/shop", icon: ShoppingBag, roles: ["OWNER", "STAFF"] },
        { label: "Champions Bar", href: "/admin/bar", icon: Wine, roles: ["OWNER", "STAFF"] },
        { label: "Kitchen Board", href: "/kitchen", icon: ChefHat, roles: ["OWNER", "STAFF"] },
      ],
    },
    {
      title: "Management",
      links: [
        { label: "Transactions", href: "/admin/transactions", icon: BookOpen, roles: ["OWNER"] },
        { label: "Expenses", href: "/admin/expenses", icon: Receipt, roles: ["OWNER"] },
      ],
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between bg-white select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#E5E7EB]">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#0B3B2C] text-white flex items-center justify-center font-bold shadow-sm">
              <Trophy className="h-4 w-4 text-[#C8F13A]" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-[#0F172A] leading-none">
                CHAMPIONS CLUB
              </div>
              <div className="text-[10px] text-[#64748B] font-medium tracking-wide uppercase mt-0.5">
                Staff & Owner Portal
              </div>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-3 mx-3 my-3 bg-[#F8FAFC] rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-[#0F172A] truncate max-w-[130px]">
              {user.name}
            </span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                role === "OWNER"
                  ? "bg-[#0B3B2C] text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              {role}
            </span>
          </div>
          <p className="text-[11px] text-[#64748B] truncate mt-0.5">{user.email}</p>
        </div>

        {/* Grouped Nav */}
        <nav className="px-3 space-y-4 pt-1">
          {sections.map((sec) => {
            const visibleLinks = sec.links.filter((l) => l.roles.includes(role));
            if (visibleLinks.length === 0) return null;

            return (
              <div key={sec.title} className="space-y-1">
                <div className="text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase px-3 pb-1">
                  {sec.title}
                </div>
                {visibleLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg transition-colors ${
                        isActive
                          ? "bg-[#F1F5F9] text-[#0B3B2C] font-semibold border-l-2 border-[#0B3B2C]"
                          : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-[#0B3B2C]" : "text-[#64748B]"}`} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer / Sign Out */}
      <div className="p-3 border-t border-[#E5E7EB]">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Bar Hamburger */}
      <div className="md:hidden bg-white border-b border-[#E5E7EB] px-4 h-14 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-bold text-xs uppercase tracking-wider text-[#0F172A]">
          CHAMPIONS CLUB PORTAL
        </span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
          {role}
        </span>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Content */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-60 bg-white shadow-xl transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:block w-60 border-r border-[#E5E7EB] bg-white h-screen sticky top-0 shrink-0">
        {navContent}
      </aside>
    </>
  );
}
