"use client";

import { useState } from "react";
import { updateMemberDobAction } from "@/app/actions/members";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Loader2 } from "lucide-react";

interface EditDobDialogProps {
  memberId: string;
  memberName: string;
  currentDob?: string | null;
}

export function EditDobDialog({
  memberId,
  memberName,
  currentDob,
}: EditDobDialogProps) {
  const [open, setOpen] = useState(false);
  const [dob, setDob] = useState(currentDob ? new Date(currentDob).toISOString().split("T")[0] : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!dob) {
      setError("Please select a date of birth.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await updateMemberDobAction({
        memberId,
        dateOfBirth: dob,
      });

      if (res.success) {
        setOpen(false);
      } else {
        setError(res.error || "Failed to update date of birth.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-6 px-2 text-[11px] text-gray-600 hover:text-gray-900 border border-gray-200 hover:bg-gray-50"
      >
        <Calendar className="h-3 w-3 mr-1" /> Edit DOB
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Edit Date of Birth: {memberName}</DialogTitle>
            <DialogDescription className="text-xs text-gray-600 pt-1 leading-relaxed">
              Every date of birth modification is permanently recorded in the audit log with your name, timestamp, and previous value.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 font-semibold">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                Date of Birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <DialogFooter className="flex sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={handleSave}
              className="bg-[#23513C] hover:bg-[#1a3d2d] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...
                </>
              ) : (
                "Save & Log"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
