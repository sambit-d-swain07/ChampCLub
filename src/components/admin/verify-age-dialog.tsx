"use client";

import { useState } from "react";
import { verifyMemberAgeAction } from "@/app/actions/members";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";

interface VerifyAgeDialogProps {
  memberId: string;
  memberName: string;
  membershipNo: string;
}

export function VerifyAgeDialog({
  memberId,
  memberName,
  membershipNo,
}: VerifyAgeDialogProps) {
  const [open, setOpen] = useState(false);
  const [docType, setDocType] = useState<"SCHOOL_ID" | "AADHAAR" | "BIRTH_CERTIFICATE" | "OTHER">("SCHOOL_ID");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await verifyMemberAgeAction({
        memberId,
        ageDocType: docType,
      });

      if (res.success) {
        setOpen(false);
      } else {
        setError(res.error || "Failed to verify age.");
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
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
      >
        <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Verify age
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Verify Junior Age: {memberName}</DialogTitle>
            <DialogDescription className="text-xs text-gray-600 pt-1 leading-relaxed">
              Confirm that a valid physical document was inspected for <strong>{membershipNo}</strong>. Only the document type is recorded—no ID numbers or photos are stored.
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
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="SCHOOL_ID">School ID</option>
                <option value="AADHAAR">Aadhaar</option>
                <option value="BIRTH_CERTIFICATE">Birth Certificate</option>
                <option value="OTHER">Other Official Document</option>
              </select>
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
              onClick={handleVerify}
              className="bg-[#23513C] hover:bg-[#1a3d2d] text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Confirming...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
