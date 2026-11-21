"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs text-muted-foreground hover:text-destructive h-8"
      onClick={handleSignOut}
    >
      <LogOut className="h-3.5 w-3.5 mr-1.5" />
      Sign Out
    </Button>
  );
}
