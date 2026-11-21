"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cancelMemberBookingAction, joinSocialAction } from "@/app/actions/bookings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CalendarDays,
  Clock,
  ArrowLeft,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Trophy
} from "lucide-react";

interface BookingItem {
  id: string;
  courtName: string;
  sport: string;
  startsAt: string;
  endsAt: string;
  status: string;
  kind: string;
  pricePaid: number;
  canCancel: boolean;
  hoursUntilStart: number;
}

interface SocialItem {
  id: string;
  courtName: string;
  sport: string;
  startsAt: string;
  endsAt: string;
  pricePerPerson: number;
  capacity: number;
  participantCount: number;
  isJoined: boolean;
}

export function MemberBookingsList({
  bookings,
  socialSessions,
}: {
  bookings: BookingItem[];
  socialSessions: SocialItem[];
}) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this reservation? The fee will be credited back.")) {
      return;
    }

    setCancellingId(bookingId);
    setMessage(null);

    const res = await cancelMemberBookingAction(bookingId);

    if (!res.success) {
      setMessage({ type: "error", text: res.error || "Failed to cancel reservation." });
      setCancellingId(null);
      return;
    }

    setMessage({ type: "success", text: "Reservation cancelled successfully." });
    setCancellingId(null);
    router.refresh();
  };

  const handleJoinSocial = async (bookingId: string) => {
    setJoiningId(bookingId);
    setMessage(null);

    const res = await joinSocialAction(bookingId);

    if (!res.success) {
      setMessage({ type: "error", text: res.error || "Failed to join session." });
      setJoiningId(null);
      return;
    }

    setMessage({ type: "success", text: "Successfully joined Friday Social Play!" });
    setJoiningId(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link href="/member">
          <Button variant="ghost" size="sm" className="text-xs">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Member Lounge
          </Button>
        </Link>
        <Badge variant="outline" className="text-xs text-muted-foreground">
          24h Self-Cancellation Policy Enforced
        </Badge>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Friday Social Play Invitations */}
      {socialSessions.length > 0 && (
        <Card className="border border-purple-500/30 bg-purple-500/5 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-bold text-foreground">Friday Evening Social Play</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Exclusive social sessions: join individual player slots with matched club partners.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {socialSessions.map((social) => (
                <div
                  key={social.id}
                  className="bg-card border rounded-lg p-3.5 flex flex-col justify-between space-y-2 shadow-xs"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-foreground">{social.courtName}</span>
                      <Badge className="bg-purple-600 text-[10px]">{social.sport}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(social.startsAt).toLocaleDateString()} •{" "}
                      {new Date(social.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-xs font-semibold text-emerald-700 mt-1">
                      ₹{social.pricePerPerson} per player • {social.participantCount}/{social.capacity} slots filled
                    </div>
                  </div>

                  <div>
                    {social.isJoined ? (
                      <Badge variant="outline" className="border-emerald-600 text-emerald-700 text-xs">
                        ✓ Joined Session
                      </Badge>
                    ) : social.participantCount >= social.capacity ? (
                      <Badge variant="secondary" className="text-xs">Session Full</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleJoinSocial(social.id)}
                        disabled={joiningId === social.id}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
                      >
                        {joiningId === social.id ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Joining...
                          </span>
                        ) : (
                          "Join Social Play"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Member Reservations Table */}
      <Card className="shadow-sm border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            <CardTitle className="text-sm font-semibold">My Court Reservations</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Review active and past court bookings. Cancellations are permitted up to 24 hours prior to game start.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Court & Sport</TableHead>
                <TableHead className="text-xs">Date & Time (IST)</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Fee Paid</TableHead>
                <TableHead className="text-xs text-right">Self-Cancel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length > 0 ? (
                bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="text-xs font-bold text-foreground">{b.courtName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{b.sport}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-medium">
                        {new Date(b.startsAt).toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(b.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(b.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={b.status === "CONFIRMED" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-right">
                      ₹{b.pricePaid.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {b.status === "CONFIRMED" ? (
                        b.canCancel ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(b.id)}
                            disabled={cancellingId === b.id}
                            className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                          >
                            {cancellingId === b.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Cancel (Free)"
                            )}
                          </Button>
                        ) : (
                          <span
                            title="Cannot self-cancel within 24 hours of start. Contact front desk staff."
                            className="text-[10px] text-muted-foreground cursor-not-allowed bg-muted px-2 py-1 rounded"
                          >
                            &lt;24h Cutoff
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Cancelled</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                    No court reservations recorded.
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
