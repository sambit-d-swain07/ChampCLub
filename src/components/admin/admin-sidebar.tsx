"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
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
        { label: "Dashboard", href: "/admin", roles: ["OWNER"] },
        { label: "Executive Finance", href: "/admin/owner", roles: ["OWNER"] },
      ],
    },
    {
      title: "Operations",
      links: [
        { label: "Courts & Bookings", href: "/admin/courts", roles: ["OWNER", "STAFF"] },
        { label: "Members", href: "/admin/members", roles: ["OWNER", "STAFF"] },
      ],
    },
    {
      title: "Commerce & F&B",
      links: [
        { label: "Pro Shop", href: "/admin/shop", roles: ["OWNER", "STAFF"] },
        { label: "Champions Bar", href: "/admin/bar", roles: ["OWNER", "STAFF"] },
        { label: "Inventory", href: "/admin/inventory", roles: ["OWNER", "STAFF"] },
      ],
    },
    {
      title: "Management",
      links: [
        { label: "Transactions", href: "/admin/transactions", roles: ["OWNER"] },
        { label: "Expenses", href: "/admin/expenses", roles: ["OWNER"] },
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
        <div className="h-14 flex items-center justify-between px-5 border-b border-[#E5E7EB]">
          <Link href="/admin" prefetch={false} className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#1F4A33] flex items-center justify-center shrink-0">
              <span className="text-white text-[11px] font-bold">CC</span>
            </div>
            <div className="font-bold text-sm tracking-tight text-[#0F172A] leading-none">
              CHAMPIONS CLUB
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
                  ? "bg-[#1F4A33] text-white"
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
              <div key={sec.title} className="space-y-0.5">
                <div className="text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase px-3 pb-1">
                  {sec.title}
                </div>
                {visibleLinks.map((link) => {
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center px-3 py-2 text-xs rounded-lg transition-colors ${
                        isActive
                          ? "bg-[#F1F5F9] text-[#1F4A33] font-semibold border-l-2 border-[#1F4A33]"
                          : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                      }`}
                    >
                      {link.label}
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
          CHAMPIONS CLUB
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-56 bg-white shadow-xl transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:block w-56 border-r border-[#E5E7EB] bg-white h-screen sticky top-0 shrink-0">
        {navContent}
      </aside>
    </>
  );
}
