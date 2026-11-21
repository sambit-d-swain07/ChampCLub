"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Share2, Calendar, Check, Copy } from "lucide-react";
import { createShareLinkAction } from "@/app/actions/finance";

interface FinanceFilterBarProps {
  currentRange: string;
  from?: string;
  to?: string;
}

export function FinanceFilterBar({ currentRange, from, to }: FinanceFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [customFrom, setCustomFrom] = useState(from || new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(to || new Date().toISOString().slice(0, 10));
  const [showCustom, setShowCustom] = useState(currentRange === "custom");

  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const applyRange = (range: string, customF?: string, customT?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    if (range === "custom" && customF && customT) {
      params.set("from", customF);
      params.set("to", customT);
    } else {
      params.delete("from");
      params.delete("to");
    }
    startTransition(() => {
      router.push(`/admin/owner?${params.toString()}`);
    });
  };

  const handleShare = async () => {
    const res = await createShareLinkAction({
      range: currentRange,
      from,
      to,
    });
    if (res.success && res.shareUrl) {
      const fullUrl = `${window.location.origin}${res.shareUrl}`;
      setShareUrl(fullUrl);
      setShareOpen(true);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const exportUrl = `/api/finance/export?range=${currentRange}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-3 rounded-xl border shadow-xs">
      {/* Range Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={currentRange === "today" ? "default" : "outline"}
          className="text-xs h-8"
          disabled={isPending}
          onClick={() => {
            setShowCustom(false);
            applyRange("today");
          }}
        >
          Today
        </Button>
        <Button
          size="sm"
          variant={currentRange === "week" ? "default" : "outline"}
          className="text-xs h-8"
          disabled={isPending}
          onClick={() => {
            setShowCustom(false);
            applyRange("week");
          }}
        >
          This Week
        </Button>
        <Button
          size="sm"
          variant={currentRange === "month" ? "default" : "outline"}
          className="text-xs h-8"
          disabled={isPending}
          onClick={() => {
            setShowCustom(false);
            applyRange("month");
          }}
        >
          This Month
        </Button>
        <Button
          size="sm"
          variant={currentRange === "custom" ? "default" : "outline"}
          className="text-xs h-8"
          disabled={isPending}
          onClick={() => setShowCustom(!showCustom)}
        >
          <Calendar className="h-3.5 w-3.5 mr-1" />
          Custom Range
        </Button>

        {showCustom && (
          <div className="flex items-center gap-1.5 ml-1 bg-muted/60 p-1 rounded-md border text-xs">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-7 text-xs w-32"
            />
            <span className="text-muted-foreground text-[11px]">to</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-7 text-xs w-32"
            />
            <Button
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => applyRange("custom", customFrom, customTo)}
              disabled={isPending}
            >
              Apply
            </Button>
          </div>
        )}
      </div>

      {/* Action Buttons: Export CSV & Share Link */}
      <div className="flex items-center gap-2">
        <a href={exportUrl} download>
          <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </a>
        <Button size="sm" variant="default" className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleShare}>
          <Share2 className="h-3.5 w-3.5" />
          Share Summary
        </Button>
      </div>

      {/* Share Link Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Public Financial Summary Link</DialogTitle>
            <DialogDescription className="text-xs">
              This link grants read-only access to the financial summary for this period without requiring credentials.
              Valid for 48 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl || ""}
                className="text-xs font-mono bg-muted select-all"
              />
              <Button size="sm" onClick={handleCopy} className="text-xs gap-1 shrink-0">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tip: Share this link with investors, external accountants, or board directors.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
