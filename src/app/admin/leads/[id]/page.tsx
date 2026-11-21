import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarClock, User, Mail, Phone, FileText, Users } from "lucide-react";
import { LeadDetailForms } from "@/components/admin/lead-detail-forms";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTE_SENT: "Quote Sent",
  CONVERTED: "Converted",
  LOST: "Lost",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-sky-100 text-sky-800 border-sky-200",
  CONTACTED: "bg-amber-100 text-amber-800 border-amber-200",
  QUOTE_SENT: "bg-purple-100 text-purple-800 border-purple-200",
  CONVERTED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  LOST: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  if (!user || role === "MEMBER") {
    redirect("/member");
  }

  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  // Fetch trial booking if exists
  let trialBooking: {
    id: string;
    court: { name: string; sport: string };
    startsAt: Date;
  } | null = null;
  if (lead.trialBookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: lead.trialBookingId },
      include: { court: { select: { name: true, sport: true } } },
    });
    if (booking) {
      trialBooking = {
        id: booking.id,
        court: booking.court,
        startsAt: booking.startsAt,
      };
    }
  }

  // Fetch staff users for assignment dropdown
  const staffUsers = await prisma.user.findMany({
    where: { role: "STAFF" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Fetch plans for conversion
  const plans = await prisma.plan.findMany({
    orderBy: { price: "asc" },
    select: { id: true, name: true, price: true, durationDays: true },
  });

  // Assigned staff name
  let assignedName = "Unassigned";
  if (lead.assignedTo) {
    const found = staffUsers.find((s) => s.id === lead.assignedTo);
    assignedName = found ? found.name : "Unknown";
  }

  const canConvert =
    lead.status === "QUOTE_SENT" || lead.status === "CONVERTED";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/leads">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Leads
          </Button>
        </Link>
      </div>

      {/* Lead Info Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-bold">{lead.name}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[lead.status] || ""}`}
                >
                  {STATUS_LABELS[lead.status] || lead.status}
                </span>
                <span className="text-xs text-muted-foreground">
                  Created {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>
            <Link href={`/admin/leads/${lead.id}/quote`}>
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Send Quote
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {lead.email || "No email"}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {lead.phone || "No phone"}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            Assigned: <span className="text-foreground font-medium">{assignedName}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            Follow-up:{" "}
            <span className="text-foreground font-medium">
              {lead.followUpAt
                ? new Date(lead.followUpAt).toLocaleDateString("en-IN")
                : "Not set"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
            <Users className="h-3.5 w-3.5 shrink-0" />
            Source: <span className="text-foreground font-medium">{lead.source}</span>
          </div>
          {trialBooking && (
            <div className="col-span-2 p-3 bg-sky-50 border border-sky-200 rounded-md">
              <div className="text-xs font-semibold text-sky-800 mb-1">Trial Booking</div>
              <div className="text-xs text-sky-700">
                {trialBooking.court.name} ({trialBooking.court.sport}) —{" "}
                {new Date(trialBooking.startsAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Forms (client component) */}
      <LeadDetailForms
        lead={{
          id: lead.id,
          status: lead.status,
          notes: lead.notes || "",
          followUpAt: lead.followUpAt ? lead.followUpAt.toISOString() : null,
          assignedTo: lead.assignedTo || null,
        }}
        staffUsers={staffUsers}
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          durationDays: p.durationDays,
        }))}
        canConvert={canConvert}
      />
    </div>
  );
}
