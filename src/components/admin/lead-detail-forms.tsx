"use client";

import { useState, useTransition } from "react";
import {
  updateLeadStatusAction,
  assignLeadAction,
  setLeadFollowUpAction,
  addLeadNoteAction,
  convertLeadToMemberAction,
} from "@/app/actions/leads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const ALL_STATUSES = ["NEW", "CONTACTED", "QUOTE_SENT", "CONVERTED", "LOST"];
const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTE_SENT: "Quote Sent",
  CONVERTED: "Converted",
  LOST: "Lost",
};

interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
}

interface StaffUser {
  id: string;
  name: string;
  email: string;
}

interface LeadDetailFormsProps {
  lead: {
    id: string;
    status: string;
    notes: string;
    followUpAt: string | null;
    assignedTo: string | null;
  };
  staffUsers: StaffUser[];
  plans: Plan[];
  canConvert: boolean;
}

export function LeadDetailForms({ lead, staffUsers, plans, canConvert }: LeadDetailFormsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [noteMsg, setNoteMsg] = useState("");
  const [followUpDate, setFollowUpDate] = useState(
    lead.followUpAt ? lead.followUpAt.slice(0, 10) : ""
  );
  const [followUpMsg, setFollowUpMsg] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(plans[0]?.id || "");
  const [startsAt, setStartsAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [convertMsg, setConvertMsg] = useState("");
  const [convertedMemberId, setConvertedMemberId] = useState<string | null>(null);

  const handleStatusChange = (status: string) => {
    startTransition(async () => {
      await updateLeadStatusAction(lead.id, status);
      router.refresh();
    });
  };

  const handleAssign = (staffId: string | null) => {
    if (!staffId) return;
    startTransition(async () => {
      await assignLeadAction(lead.id, staffId);
      router.refresh();
    });
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    startTransition(async () => {
      const result = await addLeadNoteAction(lead.id, note.trim());
      if (result.success) {
        setNote("");
        setNoteMsg("Note added.");
        router.refresh();
        setTimeout(() => setNoteMsg(""), 3000);
      }
    });
  };

  const handleFollowUp = async () => {
    if (!followUpDate) return;
    startTransition(async () => {
      const result = await setLeadFollowUpAction(lead.id, followUpDate);
      if (result.success) {
        setFollowUpMsg("Follow-up date saved.");
        router.refresh();
        setTimeout(() => setFollowUpMsg(""), 3000);
      }
    });
  };

  const handleConvert = async () => {
    if (!selectedPlan || !startsAt) return;
    startTransition(async () => {
      const result = await convertLeadToMemberAction(lead.id, selectedPlan, startsAt);
      if (result.success) {
        setConvertedMemberId(result.memberId);
        setConvertMsg("Lead successfully converted to member!");
        router.refresh();
      } else {
        setConvertMsg("Conversion failed. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Status change */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Change Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={lead.status === s ? "default" : "outline"}
              className="text-xs"
              disabled={isPending || lead.status === s}
              onClick={() => handleStatusChange(s)}
            >
              {STATUS_LABELS[s]}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Assign Staff */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Assign Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            defaultValue={lead.assignedTo || ""}
            onValueChange={handleAssign}
            disabled={isPending}
          >
            <SelectTrigger className="text-xs w-56">
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staffUsers.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
              {staffUsers.length === 0 && (
                <SelectItem value="none" disabled className="text-xs text-muted-foreground">
                  No staff users found
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Follow-up date */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Follow-up Date</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="text-xs w-44"
            disabled={isPending}
          />
          <Button
            size="sm"
            className="text-xs"
            onClick={handleFollowUp}
            disabled={isPending || !followUpDate}
          >
            Save
          </Button>
          {followUpMsg && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> {followUpMsg}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lead.notes && (
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded p-3 border font-sans">
              {lead.notes}
            </pre>
          )}
          <Textarea
            placeholder="Add a note..."
            value={note}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
            rows={3}
            className="text-xs"
            disabled={isPending}
          />
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="text-xs"
              onClick={handleAddNote}
              disabled={isPending || !note.trim()}
            >
              Add Note
            </Button>
            {noteMsg && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> {noteMsg}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Convert to Member */}
      {canConvert && (
        <Card className="shadow-sm border-emerald-200 bg-emerald-50/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-emerald-800">
              Convert to Member
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {convertedMemberId ? (
              <div className="text-xs text-emerald-700 flex items-center gap-2 font-medium">
                <CheckCircle className="h-4 w-4" />
                {convertMsg}{" "}
                <a
                  href={`/admin/members/${convertedMemberId}`}
                  className="underline"
                >
                  View member profile
                </a>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Membership Plan
                    </label>
                    <Select
                      value={selectedPlan}
                      onValueChange={(v: string | null) => { if (v) setSelectedPlan(v); }}
                      disabled={isPending}
                    >
                      <SelectTrigger className="text-xs w-52">
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} — ₹{p.price.toLocaleString("en-IN")} /{" "}
                            {p.durationDays}d
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="text-xs w-44"
                      disabled={isPending}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="text-xs bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleConvert}
                    disabled={isPending || !selectedPlan || !startsAt}
                  >
                    Convert to Member
                  </Button>
                </div>
                {convertMsg && (
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {convertMsg}
                  </span>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
