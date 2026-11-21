"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="h-9 px-4 rounded-full border border-[#E6E6E6] text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] hover:bg-[#EFEFEF] transition-colors flex items-center gap-1.5 cursor-pointer"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>Sign out</span>
    </button>
  );
}
