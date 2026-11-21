"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  ShoppingBag, 
  Wine, 
  UserCheck, 
  Landmark, 
  ShieldCheck, 
  LogOut, 
  Trophy 
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = user.role;

  const links = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard, roles: ["OWNER", "STAFF"] },
    { label: "Courts & Bookings", href: "/admin/courts", icon: CalendarDays, roles: ["OWNER", "STAFF"] },
    { label: "Members", href: "/admin/members", icon: Users, roles: ["OWNER", "STAFF"] },
    { label: "Pro Shop", href: "/admin/shop", icon: ShoppingBag, roles: ["OWNER", "STAFF"] },
    { label: "Champions Bar", href: "/admin/bar", icon: Wine, roles: ["OWNER", "STAFF"] },
    { label: "Leads & CRM", href: "/admin/leads", icon: UserCheck, roles: ["OWNER", "STAFF"] },
    { label: "Ledger & Finance", href: "/admin/finance", icon: Landmark, roles: ["OWNER"] },
    { label: "Audit Logs", href: "/admin/audit", icon: ShieldCheck, roles: ["OWNER"] },
  ];

  const allowedLinks = links.filter((link) => link.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Brand header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-foreground">THE CHAMPIONS CLUB</div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Management Suite</div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-muted/60 rounded-lg border">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-xs truncate max-w-[120px]">{user.name}</span>
            <Badge variant={role === "OWNER" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
              {role}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-1">
          {allowedLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Sign Out */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs text-muted-foreground hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
