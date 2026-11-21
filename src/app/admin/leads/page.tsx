import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, Eye } from "lucide-react";

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

const SOURCE_LABELS: Record<string, string> = {
  TRIAL_BOOKING: "Trial Booking",
  WALK_IN: "Walk-in",
  REFERRAL: "Referral",
  ONLINE: "Online",
  PHONE: "Phone",
};

function formatAge(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ALL_STATUSES = ["NEW", "CONTACTED", "QUOTE_SENT", "CONVERTED", "LOST"];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  if (!user || role === "MEMBER") {
    redirect("/member");
  }

  const { status } = await searchParams;
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { createdAt: "desc" },
  });

  // Fetch assigned staff names
  const assignedIds = leads
    .filter((l) => l.assignedTo)
    .map((l) => l.assignedTo as string);
  const staffMap: Record<string, string> = {};
  if (assignedIds.length > 0) {
    const staffUsers = await prisma.user.findMany({
      where: { id: { in: assignedIds } },
      select: { id: true, name: true },
    });
    for (const u of staffUsers) staffMap[u.id] = u.name;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-emerald-600" />
          Leads &amp; CRM
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track and manage prospective members through the sales pipeline.
        </p>
      </div>

      {/* Status filter buttons */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/leads">
          <Button
            variant={!status ? "default" : "outline"}
            size="sm"
            className="text-xs"
          >
            All
          </Button>
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link key={s} href={`/admin/leads?status=${s}`}>
            <Button
              variant={status === s ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              {STATUS_LABELS[s]}
            </Button>
          </Link>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {leads.length} lead{leads.length !== 1 ? "s" : ""}{" "}
            {status ? `· ${STATUS_LABELS[status]}` : "· All Statuses"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs pl-6">Name</TableHead>
                <TableHead className="text-xs">Contact</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs">Assigned To</TableHead>
                <TableHead className="text-xs">Follow-up</TableHead>
                <TableHead className="text-xs">Age</TableHead>
                <TableHead className="text-xs text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-xs text-muted-foreground py-10"
                  >
                    No leads found.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => {
                  const isOverdue =
                    lead.status === "NEW" && lead.createdAt < twoHoursAgo;
                  return (
                    <TableRow key={lead.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-semibold pl-6">
                        <div>{lead.name}</div>
                        {isOverdue && (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 mt-0.5">
                            OVERDUE
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{lead.email || "—"}</div>
                        <div>{lead.phone || "—"}</div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[lead.status] || ""}`}
                        >
                          {STATUS_LABELS[lead.status] || lead.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {SOURCE_LABELS[lead.source] || lead.source}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lead.assignedTo ? (staffMap[lead.assignedTo] || "—") : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {lead.followUpAt
                          ? new Date(lead.followUpAt).toLocaleDateString("en-IN")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatAge(lead.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Link href={`/admin/leads/${lead.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
