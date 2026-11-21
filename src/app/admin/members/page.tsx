import Link from "next/link";
import { searchMembers, getPlans } from "@/lib/services/members";
import { MemberSearchInput } from "@/components/admin/member-search-input";
import { RegisterMemberDialog } from "@/components/admin/register-member-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, ArrowRight, ShieldCheck, Clock, AlertOctagon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [members, plans] = await Promise.all([
    searchMembers(q),
    getPlans(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header & Registration CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Club Membership Roster</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage member privileges, entitlement status, renewals, and turnstile tokens.
          </p>
        </div>
        <RegisterMemberDialog plans={plans} />
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <MemberSearchInput initialQuery={q} />
        <div className="text-xs text-muted-foreground">
          Showing <strong>{members.length}</strong> registered members
        </div>
      </div>

      {/* Members Data Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Active Member Roster</CardTitle>
          <CardDescription className="text-xs">
            Status is computed dynamically with a 7-day grace period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Member No</TableHead>
                <TableHead className="text-xs">Name & Email</TableHead>
                <TableHead className="text-xs">Plan</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Privileges</TableHead>
                <TableHead className="text-xs">Valid Until</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length > 0 ? (
                members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {m.membershipNo}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-semibold text-foreground">{m.name}</div>
                      <div className="text-[11px] text-muted-foreground">{m.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {m.planName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.status === "ACTIVE" && (
                        <Badge className="bg-emerald-600 text-white text-[10px] flex items-center gap-1 w-fit">
                          <ShieldCheck className="h-3 w-3" /> ACTIVE
                        </Badge>
                      )}
                      {m.status === "GRACE" && (
                        <Badge className="bg-amber-500 text-white text-[10px] flex items-center gap-1 w-fit">
                          <Clock className="h-3 w-3" /> 7D GRACE
                        </Badge>
                      )}
                      {m.status === "EXPIRED" && (
                        <Badge variant="destructive" className="text-[10px] flex items-center gap-1 w-fit">
                          <AlertOctagon className="h-3 w-3" /> EXPIRED
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.courtDiscountPct}% Crt • {m.shopDiscountPct}% Shop • {m.barDiscountPct}% Bar
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.endsAt ? new Date(m.endsAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/members/${m.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2">
                          Profile <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    No members found matching &quot;{q}&quot;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
