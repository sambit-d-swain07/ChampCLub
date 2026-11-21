"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyQrButton({ qrToken }: { qrToken: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(qrToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs h-7"
      onClick={handleCopy}
    >
      {copied ? (
        <span className="flex items-center text-emerald-600 gap-1">
          <Check className="h-3 w-3" /> Copied Token
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Copy className="h-3 w-3" /> Copy QR Token
        </span>
      )}
    </Button>
  );
}
