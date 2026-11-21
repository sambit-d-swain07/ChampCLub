"use client";

import { useState } from "react";
import { banMemberAction } from "@/app/actions/members";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";

interface BanMemberDialogProps {
  memberId: string;
  membershipNo: string;
  memberName: string;
  isBanned: boolean;
}

export function BanMemberDialog({
  memberId,
  membershipNo,
  memberName,
  isBanned,
}: BanMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<"Misconduct" | "Non-payment" | "Fraud" | "Other">("Misconduct");
  const [note, setNote] = useState("");
  const [confirmInput, setConfirmInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isBanned) {
    return (
      <Button
        variant="destructive"
        size="sm"
        disabled
        className="opacity-75 cursor-not-allowed bg-red-600/80 text-white font-semibold text-xs"
      >
        <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Banned
      </Button>
    );
  }

  const isConfirmed = confirmInput.trim().toUpperCase() === membershipNo.trim().toUpperCase();

  const handleBan = async () => {
    if (!isConfirmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await banMemberAction({
        memberId,
        reason,
        note: note.trim() || undefined,
        confirmId: confirmInput.trim(),
      });

      if (res.success) {
        setOpen(false);
      } else {
        setError(res.error || "Failed to ban member.");
      }
    } catch {
      setError("An unexpected error occurred while banning member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 text-xs font-semibold"
      >
        <ShieldAlert className="h-3.5 w-3.5 mr-1 text-red-600" /> Ban account
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle className="text-red-700">Ban Account: {memberName}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-gray-600 pt-2 leading-relaxed">
            This will permanently revoke all active sessions for <strong>{membershipNo}</strong> and cancel all upcoming court bookings so the slots become free. Past booking and purchase history is kept. There is no unban option.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
              Ban Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              <option value="Misconduct">Misconduct</option>
              <option value="Non-payment">Non-payment</option>
              <option value="Fraud">Fraud</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
              Optional Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Provide context or incident details..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <div className="space-y-1.5 p-3 rounded-lg bg-red-50/50 border border-red-100">
            <label className="block font-bold text-red-900 uppercase tracking-wider text-[10px]">
              Type Member ID to Confirm ({membershipNo})
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={membershipNo}
              className="w-full px-3 py-2 rounded-lg border border-red-300 font-mono uppercase text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 bg-white"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleBan}
            disabled={!isConfirmed || loading}
            className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> Banning...
              </>
            ) : (
              "Ban permanently"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
