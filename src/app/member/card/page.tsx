import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowLeft, ShieldCheck, Clock, AlertOctagon } from "lucide-react";
import { CopyQrButton } from "@/components/member/copy-qr-button";

export const dynamic = "force-dynamic";

export default async function MemberCardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const member = await prisma.member.findUnique({
    where: { userId: user.id },
    include: { user: true },
  });

  if (!member) {
    redirect("/member");
  }

  const entitlement = await resolve(member.id);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mb-4 flex justify-between items-center">
        <Link href="/member">
          <Button variant="ghost" size="sm" className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Member Lounge
          </Button>
        </Link>
        <span className="text-[11px] text-muted-foreground font-mono">{member.membershipNo}</span>
      </div>

      {/* Luxury Member Pass Card */}
      <Card className="w-full max-w-sm border-2 border-emerald-600/40 shadow-2xl overflow-hidden bg-card">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-800 to-slate-900 text-white p-6 relative">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] tracking-widest uppercase font-semibold text-emerald-200">
                Official Digital Member Card
              </div>
              <h2 className="text-xl font-bold tracking-tight mt-1">{member.user?.name || `Member ${member.membershipNo}`}</h2>
              <div className="font-mono text-xs text-emerald-100 mt-0.5">{member.membershipNo}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-emerald-300" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Badge className="bg-emerald-500 text-white text-[10px] uppercase font-bold">
              {entitlement.plan?.name || "MEMBER"} TIER
            </Badge>
            {entitlement.status === "ACTIVE" && (
              <Badge variant="outline" className="text-emerald-200 border-emerald-400 text-[10px]">
                <ShieldCheck className="h-3 w-3 mr-1" /> Active
              </Badge>
            )}
            {entitlement.status === "GRACE" && (
              <Badge className="bg-amber-500 text-white text-[10px]">
                <Clock className="h-3 w-3 mr-1" /> Grace Period
              </Badge>
            )}
            {entitlement.status === "EXPIRED" && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertOctagon className="h-3 w-3 mr-1" /> Expired
              </Badge>
            )}
          </div>
        </div>

        {/* QR Code Presentation */}
        <CardContent className="p-6 flex flex-col items-center space-y-4">
          <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 flex flex-col items-center">
            {/* SVG Visual QR matrix */}
            <svg
              className="w-48 h-48"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Corner Position Detection Patterns */}
              <rect x="15" y="15" width="50" height="50" rx="6" fill="#0f172a" />
              <rect x="25" y="25" width="30" height="30" rx="3" fill="#ffffff" />
              <rect x="33" y="33" width="14" height="14" rx="2" fill="#0f172a" />

              <rect x="135" y="15" width="50" height="50" rx="6" fill="#0f172a" />
              <rect x="145" y="25" width="30" height="30" rx="3" fill="#ffffff" />
              <rect x="153" y="33" width="14" height="14" rx="2" fill="#0f172a" />

              <rect x="15" y="135" width="50" height="50" rx="6" fill="#0f172a" />
              <rect x="25" y="145" width="30" height="30" rx="3" fill="#ffffff" />
              <rect x="33" y="153" width="14" height="14" rx="2" fill="#0f172a" />

              {/* Data modules pattern */}
              <rect x="75" y="20" width="12" height="12" fill="#0f172a" />
              <rect x="95" y="20" width="12" height="12" fill="#059669" />
              <rect x="115" y="20" width="12" height="12" fill="#0f172a" />

              <rect x="75" y="40" width="12" height="12" fill="#059669" />
              <rect x="95" y="40" width="12" height="12" fill="#0f172a" />
              <rect x="115" y="40" width="12" height="12" fill="#0f172a" />

              <rect x="20" y="75" width="12" height="12" fill="#0f172a" />
              <rect x="40" y="75" width="12" height="12" fill="#059669" />
              <rect x="60" y="75" width="12" height="12" fill="#0f172a" />
              <rect x="80" y="75" width="12" height="12" fill="#0f172a" />
              <rect x="100" y="75" width="12" height="12" fill="#059669" />
              <rect x="120" y="75" width="12" height="12" fill="#0f172a" />
              <rect x="140" y="75" width="12" height="12" fill="#0f172a" />
              <rect x="165" y="75" width="12" height="12" fill="#059669" />

              <rect x="20" y="95" width="12" height="12" fill="#059669" />
              <rect x="40" y="95" width="12" height="12" fill="#0f172a" />
              <rect x="60" y="95" width="12" height="12" fill="#0f172a" />
              <rect x="80" y="95" width="12" height="12" fill="#059669" />
              <rect x="100" y="95" width="12" height="12" fill="#0f172a" />
              <rect x="120" y="95" width="12" height="12" fill="#059669" />
              <rect x="140" y="95" width="12" height="12" fill="#0f172a" />
              <rect x="165" y="95" width="12" height="12" fill="#0f172a" />

              <rect x="20" y="115" width="12" height="12" fill="#0f172a" />
              <rect x="40" y="115" width="12" height="12" fill="#0f172a" />
              <rect x="60" y="115" width="12" height="12" fill="#059669" />
              <rect x="80" y="115" width="12" height="12" fill="#0f172a" />
              <rect x="100" y="115" width="12" height="12" fill="#0f172a" />
              <rect x="120" y="115" width="12" height="12" fill="#0f172a" />
              <rect x="140" y="115" width="12" height="12" fill="#059669" />
              <rect x="165" y="115" width="12" height="12" fill="#0f172a" />

              <rect x="75" y="140" width="12" height="12" fill="#0f172a" />
              <rect x="95" y="140" width="12" height="12" fill="#059669" />
              <rect x="115" y="140" width="12" height="12" fill="#0f172a" />
              <rect x="135" y="140" width="12" height="12" fill="#0f172a" />
              <rect x="155" y="140" width="12" height="12" fill="#059669" />

              <rect x="75" y="160" width="12" height="12" fill="#059669" />
              <rect x="95" y="160" width="12" height="12" fill="#0f172a" />
              <rect x="115" y="160" width="12" height="12" fill="#0f172a" />
              <rect x="135" y="160" width="12" height="12" fill="#059669" />
              <rect x="155" y="160" width="12" height="12" fill="#0f172a" />
            </svg>
            <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">Scan for Fast Turnstile Entry</div>
          </div>

          <div className="w-full text-center space-y-1">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Pass Token</div>
            <code className="text-xs font-mono font-semibold text-foreground bg-muted px-2 py-1 rounded block">
              {member.qrToken}
            </code>
            <div className="pt-1">
              <CopyQrButton qrToken={member.qrToken} />
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/40 p-4 border-t flex justify-between items-center text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase block">Valid Until</span>
            <span className="font-semibold text-foreground">
              {entitlement.endsAt ? new Date(entitlement.endsAt).toLocaleDateString() : "N/A"}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase block">Today&apos;s Quota</span>
            <span className="font-semibold text-blue-600">{entitlement.bookingsLeftToday} Bookings Left</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
