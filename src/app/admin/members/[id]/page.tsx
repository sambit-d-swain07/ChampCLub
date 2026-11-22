import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getMemberDetail } from "@/lib/services/members";
import { BanMemberDialog } from "@/components/admin/ban-member-dialog";
import { UnbanMemberDialog } from "@/components/admin/unban-member-dialog";
import { VerifyAgeDialog } from "@/components/admin/verify-age-dialog";
import { EditDobDialog } from "@/components/admin/edit-dob-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Trophy, 
  ShieldCheck, 
  Clock, 
  AlertOctagon, 
  ArrowLeft, 
  CalendarDays, 
  ShoppingBag, 
  Wine, 
  CreditCard,
  QrCode,
  ShieldAlert
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminMemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const isOwner = session?.user?.role === "OWNER";

  const data = await getMemberDetail(decodedId);

  if (!data) {
    notFound();
  }

  const { member, entitlement, bannedByName, ageVerifiedByName } = data;
  const isBanned = Boolean(member.user?.bannedAt);
  const isJunior = entitlement.plan?.name.toUpperCase().includes("JUNIOR") || false;
  const isAgeVerified = Boolean(member.ageVerifiedAt);

  // Calculate age
  let memberAge: number | null = null;
  if (member.dateOfBirth) {
    const diff = Date.now() - new Date(member.dateOfBirth).getTime();
    memberAge = Math.abs(new Date(diff).getUTCFullYear() - 1970);
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link href="/admin/members" prefetch={false}>
          <Button variant="ghost" size="sm" className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Members
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {isJunior && !isAgeVerified && !isBanned && (
            <VerifyAgeDialog
              memberId={member.id}
              memberName={member.user?.name || `Member ${member.membershipNo}`}
              membershipNo={member.membershipNo}
            />
          )}
          {isBanned ? (
            isOwner ? (
              <UnbanMemberDialog
                memberId={member.id}
                membershipNo={member.membershipNo}
                memberName={member.user?.name || `Member ${member.membershipNo}`}
              />
            ) : null
          ) : (
            <BanMemberDialog
              memberId={member.id}
              membershipNo={member.membershipNo}
              memberName={member.user?.name || `Member ${member.membershipNo}`}
              isBanned={false}
            />
          )}
        </div>
      </div>

      {/* Banned Alert Notice */}
      {isBanned && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start sm:items-center gap-3">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5 sm:mt-0" />
          <div className="text-xs sm:text-sm font-medium leading-relaxed">
            Banned on{" "}
            {member.user?.bannedAt
              ? new Date(member.user.bannedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—"}{" "}
            by {bannedByName || "Staff"}. Reason:{" "}
            <span className="font-semibold text-red-950">{member.user?.bannedReason || "Account banned"}</span>
          </div>
        </div>
      )}

      {/* Member Hero Card */}
      <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {member.membershipNo}
            </span>
            {isBanned ? (
              <Badge variant="destructive" className="bg-red-600 text-white text-[10px] font-bold">
                <AlertOctagon className="h-3 w-3 mr-1" /> BANNED
              </Badge>
            ) : entitlement.status === "ACTIVE" ? (
              <Badge className="bg-emerald-600 text-white text-[10px]">
                <ShieldCheck className="h-3 w-3 mr-1" /> ACTIVE
              </Badge>
            ) : entitlement.status === "GRACE" ? (
              <Badge className="bg-amber-500 text-white text-[10px]">
                <Clock className="h-3 w-3 mr-1" /> 7-DAY GRACE PERIOD
              </Badge>
            ) : entitlement.status === "EXPIRED" ? (
              <Badge variant="destructive" className="text-[10px]">
                <AlertOctagon className="h-3 w-3 mr-1" /> EXPIRED
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                WALK-IN
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{member.user?.name || `Member ${member.membershipNo}`}</h1>
          <p className="text-xs text-muted-foreground">{member.user?.email || "No email linked"}</p>

          {/* DOB & Age Verification Badge */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-muted-foreground">
              DOB:{" "}
              <strong className="text-foreground">
                {member.dateOfBirth
                  ? new Date(member.dateOfBirth).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "Not set"}
              </strong>
              {memberAge !== null && ` (${memberAge} yrs)`}
            </span>

            <EditDobDialog
              memberId={member.id}
              memberName={member.user?.name || `Member ${member.membershipNo}`}
              currentDob={member.dateOfBirth ? member.dateOfBirth.toISOString() : null}
            />

            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                isAgeVerified
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {isAgeVerified
                ? `Verified by ${ageVerifiedByName || "Staff"}${
                    member.ageVerifiedAt
                      ? ` on ${new Date(member.ageVerifiedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}`
                      : ""
                  }${member.ageDocType ? ` (${member.ageDocType})` : ""}`
                : "Not verified"}
            </span>
          </div>
        </div>

        {/* QR Token & Scan Preview */}
        <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-lg border">
          <QrCode className="h-10 w-10 text-foreground" />
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase">Fast-Pass Token</div>
            <code className="text-xs font-mono font-bold text-foreground block">{member.qrToken}</code>
          </div>
        </div>
      </div>

      {/* Entitlement Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{entitlement.plan?.name || "NONE"}</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valid until {entitlement.endsAt ? new Date(entitlement.endsAt).toLocaleDateString() : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Bookings Left Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">{entitlement.bookingsLeftToday} slots</div>
            <p className="text-xs text-muted-foreground mt-0.5">Daily quota limit</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Court Privilege</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{entitlement.courtDiscountPct}% OFF</div>
            <p className="text-xs text-muted-foreground mt-0.5">Applies to all sports</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">Shop & Bar Perks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-purple-600">
              {entitlement.shopDiscountPct}% / {entitlement.barDiscountPct}%
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Shop & F&B discount rates</p>
          </CardContent>
        </Card>
      </div>

      {/* Ban History */}
      {member.auditLogs && member.auditLogs.length > 0 && (
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="py-2.5 px-4 border-b bg-gray-50/50">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-gray-500" />
              Ban History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="space-y-1.5 text-xs">
              {member.auditLogs.map((log) => {
                const isUnban = log.action === "UNBAN" || log.field === "UNBAN";
                const actionLabel = isUnban ? "Unbanned" : "Banned";
                const dateStr = new Date(log.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const actor = log.changedBy || "Club Owner";
                const reason = log.reason || log.newValue || "No reason specified";
                return (
                  <li key={log.id} className="flex items-center gap-2 text-gray-800">
                    <span
                      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                        isUnban ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <span>
                      {actionLabel}, {dateStr}, by {actor}, {reason}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Activity History in Tabs */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Member Activity & Transaction History</CardTitle>
          <CardDescription className="text-xs">
            Comprehensive log of bookings, counter purchases, open tabs, and plan subscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bookings" className="w-full">
            <TabsList className="grid grid-cols-4 w-full sm:w-[480px]">
              <TabsTrigger value="bookings" className="text-xs">
                <CalendarDays className="h-3.5 w-3.5 mr-1" /> Courts ({member.bookings.length})
              </TabsTrigger>
              <TabsTrigger value="shop" className="text-xs">
                <ShoppingBag className="h-3.5 w-3.5 mr-1" /> Pro Shop ({member.shopOrders.length})
              </TabsTrigger>
              <TabsTrigger value="bar" className="text-xs">
                <Wine className="h-3.5 w-3.5 mr-1" /> Bar Tabs ({member.tabs.length})
              </TabsTrigger>
              <TabsTrigger value="memberships" className="text-xs">
                <CreditCard className="h-3.5 w-3.5 mr-1" /> Plans ({member.memberships.length})
              </TabsTrigger>
            </TabsList>

            {/* Bookings Tab */}
            <TabsContent value="bookings" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Court</TableHead>
                    <TableHead className="text-xs">Start Time</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Net Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.bookings.length > 0 ? (
                    member.bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="text-xs font-medium">{b.court.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(b.startsAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">{b.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right">
                          ₹{(Number(b.priceSnapshot) - Number(b.discountSnapshot)).toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                        No court bookings found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Shop Orders Tab */}
            <TabsContent value="shop" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Order ID</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Items</TableHead>
                    <TableHead className="text-xs text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.shopOrders.length > 0 ? (
                    member.shopOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs font-mono">{o.id.slice(-6).toUpperCase()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {o.items.map((i) => `${i.product.name} (x${i.quantity})`).join(", ")}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right">
                          ₹{Number(o.totalAmount).toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                        No pro shop orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Bar Tabs Tab */}
            <TabsContent value="bar" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Tab ID</TableHead>
                    <TableHead className="text-xs">Opened At</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Tab Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.tabs.length > 0 ? (
                    member.tabs.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs font-mono">{t.id.slice(-6).toUpperCase()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(t.openedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.status === "OPEN" ? "default" : "outline"} className="text-[10px]">
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-right">
                          ₹{Number(t.totalAmount).toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                        No bar tabs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Memberships Tab */}
            <TabsContent value="memberships" className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Plan</TableHead>
                    <TableHead className="text-xs">Start Date</TableHead>
                    <TableHead className="text-xs">Expiry Date</TableHead>
                    <TableHead className="text-xs text-right">Price Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {member.memberships.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs font-bold">{m.plan.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.startsAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(m.endsAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-right">
                        ₹{Number(m.pricePaid).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
