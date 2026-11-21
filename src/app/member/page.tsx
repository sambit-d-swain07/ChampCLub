import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, QrCode, Calendar, Sparkles } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const dynamic = "force-dynamic";

export default async function MemberPortalPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const member = await prisma.member.findUnique({
    where: { userId: user.id },
    include: {
      memberships: {
        include: { plan: true },
        orderBy: { endsAt: "desc" },
        take: 1,
      },
      bookings: {
        include: { court: true },
        orderBy: { startsAt: "desc" },
        take: 5,
      },
      tabs: {
        where: { status: "OPEN" },
        include: { orders: true },
        take: 1,
      },
    },
  });

  const activeMembership = member?.memberships[0];
  const isExpired = activeMembership ? new Date(activeMembership.endsAt) < new Date() : true;

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Top Navbar */}
      <header className="h-16 border-b bg-card flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-foreground">THE CHAMPIONS CLUB</div>
            <div className="text-[10px] text-muted-foreground uppercase font-semibold">Member Lounge</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground hidden sm:inline">Signed in as <strong className="text-foreground">{user.name}</strong></span>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
        {/* Membership Pass Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Trophy className="h-64 w-64 -mr-16 -mt-16" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs py-0.5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {activeMembership?.plan.name || "MEMBER"} PASS
                </Badge>
                {isExpired ? (
                  <Badge variant="destructive" className="text-xs">Expired</Badge>
                ) : (
                  <Badge className="bg-emerald-600 text-white text-xs">Active Privilege</Badge>
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{user.name}</h1>
                <p className="text-xs text-slate-300 font-mono mt-1">No: {member?.membershipNo || "CC-2026-PENDING"}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-300">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Court Discount</span>
                  <span className="font-semibold text-white">{activeMembership?.plan.courtDiscountPct ? Number(activeMembership.plan.courtDiscountPct) : 0}% OFF</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Pro Shop Discount</span>
                  <span className="font-semibold text-white">{activeMembership?.plan.shopDiscountPct ? Number(activeMembership.plan.shopDiscountPct) : 0}% OFF</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Bar & F&B Discount</span>
                  <span className="font-semibold text-white">{activeMembership?.plan.barDiscountPct ? Number(activeMembership.plan.barDiscountPct) : 0}% OFF</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Valid Until</span>
                  <span className="font-semibold text-white">
                    {activeMembership ? new Date(activeMembership.endsAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Pass */}
            <Link href="/member/card" className="bg-white text-slate-900 p-3 rounded-xl shadow-md flex flex-col items-center gap-1.5 self-center md:self-end hover:scale-105 transition-transform cursor-pointer">
              <QrCode className="h-20 w-20 text-slate-900" />
              <span className="text-[9px] font-mono tracking-widest text-slate-600 uppercase">
                {member?.qrToken.slice(0, 14) || "FAST-PASS"}
              </span>
              <span className="text-[9px] font-semibold text-emerald-700">Open Digital Card →</span>
            </Link>
          </div>
        </div>

        {/* Member Bookings & Details */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Court Sessions */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-600" />
                My Court Reservations
              </CardTitle>
              <CardDescription className="text-xs">Your reserved slots and game history.</CardDescription>
            </CardHeader>
            <CardContent>
              {member?.bookings && member.bookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Court</TableHead>
                      <TableHead className="text-xs">Date & Time</TableHead>
                      <TableHead className="text-xs text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {member.bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="text-xs font-medium">{b.court.name.split(" (")[0]}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(b.startsAt).toLocaleDateString()} {new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className="text-[10px]">
                            {b.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">No court reservations recorded yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Active Club Privileges */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Active Club Services</CardTitle>
              <CardDescription className="text-xs">Live tabs and counter checkout privileges.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/40 rounded-lg border flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">Bar Tab Status</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {member?.tabs && member.tabs.length > 0
                      ? `Open Tab active: ₹${Number(member.tabs[0].totalAmount).toFixed(0)}`
                      : "No open tab at Champions Bar"}
                  </div>
                </div>
                <Badge variant={member?.tabs && member.tabs.length > 0 ? "default" : "secondary"} className="text-[10px]">
                  {member?.tabs && member.tabs.length > 0 ? "OPEN TAB" : "SETTLED"}
                </Badge>
              </div>

              <div className="p-4 bg-muted/40 rounded-lg border flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold">Club Entry Privilege</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Scan your digital QR Pass at the turnstiles for instant access.
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-[10px]">AUTHORIZED</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
