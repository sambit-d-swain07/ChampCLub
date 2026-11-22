"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { unbanMemberAction } from "@/app/actions/members";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, Loader2 } from "lucide-react";

interface UnbanMemberDialogProps {
  memberId: string;
  membershipNo: string;
  memberName: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UnbanMemberDialog({
  memberId,
  membershipNo,
  memberName,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: UnbanMemberDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (isControlled && setControlledOpen) {
      setControlledOpen(next);
    } else {
      setInternalOpen(next);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleUnban = async () => {
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError("Reason must be at least 3 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await unbanMemberAction({
        memberId,
        reason: trimmedReason,
      });

      if (res.success) {
        showToast("Account unbanned.");
        setReason("");
        setIsOpen(false);
        router.refresh();
      } else {
        showToast("Could not unban. Try again.");
        setError(res.error || "Could not unban. Try again.");
      }
    } catch {
      showToast("Could not unban. Try again.");
      setError("Could not unban. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)} className="inline-block">
          {trigger}
        </span>
      ) : !isControlled ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
        >
          <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Unban account
        </Button>
      ) : null}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-gray-900 text-base font-bold flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Unban Account
            </DialogTitle>
            <div className="text-xs font-medium text-gray-800">
              {memberName} ({membershipNo})
            </div>
            <p className="text-xs text-gray-600">
              The member will be able to log in again. Cancelled bookings are not restored.
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="unban-reason" className="block text-xs font-medium text-gray-700">
                Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="unban-reason"
                rows={3}
                placeholder="Reason for unbanning this member (minimum 3 characters)..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleUnban}
              disabled={loading || reason.trim().length < 3}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs ml-2"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Unban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plain toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#1B1B1B] text-white text-xs px-4 py-2.5 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
