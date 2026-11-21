"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, QrCode } from "lucide-react";

interface MemberSearchInputProps {
  initialQuery?: string;
}

export function MemberSearchInput({ initialQuery = "" }: MemberSearchInputProps) {
  const router = useRouter();
  const [val, setVal] = useState(initialQuery);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = val.trim();
    if (!query) {
      router.push("/admin/members");
      return;
    }

    // If staff scans or pastes a qrToken (starts with QR-), jump directly to the profile!
    if (query.toUpperCase().startsWith("QR-")) {
      router.push(`/admin/members/${encodeURIComponent(query)}`);
      return;
    }

    router.push(`/admin/members?q=${encodeURIComponent(query)}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search name, No, or scan QR token..."
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="pl-9 pr-9 text-xs h-9 bg-card"
      />
      <button type="submit" className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
        <QrCode className="h-4 w-4" />
      </button>
    </form>
  );
}
