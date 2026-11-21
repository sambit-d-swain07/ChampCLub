"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  bookAndConfirmAction, 
  createBookingAction, 
  confirmBookingAction, 
  cancelStaffBookingAction 
} from "@/app/actions/bookings";
import { MemberListItem } from "@/lib/services/members";
import { MemberIdInput, ResolvedMember } from "@/components/admin/member-id-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  Clock,
  Trophy,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles
} from "lucide-react";

interface CourtScheduleGridProps {
  initialDate: string;
  data: {
    date: string;
    timezone: string;
    operatingHours: { open: string; close: string };
    courts: Array<{
      id: string;
      name: string;
      sport: string;
      capacity: number;
      basePrice: number;
    }>;
    rows: Array<{
      slotKey: string;
      startTimeStr: string;
      endTimeStr: string;
      startsAt: string;
      endsAt: string;
      courts: Array<{
        courtId: string;
        status: "FREE" | "HELD" | "CONFIRMED" | "SOCIAL";
        booking: {
          id?: string;
          status?: string;
          startsAt?: string | Date;
          endsAt?: string | Date;
          holdExpiresAt?: string | Date | null;
          guestName?: string | null;
          memberName?: string | null;
          membershipNo?: string | null;
          priceSnapshot?: number;
          discountSnapshot?: number;
          pricePerPerson?: number;
          capacity?: number;
          participantCount?: number;
          participants?: Array<{ id: string; name: string }>;
        } | null;
      }>;
    }>;
  };
  members?: MemberListItem[];
}

export function CourtScheduleGrid({
  initialDate,
  data,
  members = [],
}: CourtScheduleGridProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(initialDate);

  // Booking Modal State
  const [selectedSlot, setSelectedSlot] = useState<{
    courtId: string;
    courtName: string;
    sport: string;
    basePrice: number;
    startTime: string;
    endTime: string;
    startsAt: string;
    endsAt: string;
  } | null>(null);

  const [bookingType, setBookingType] = useState<"MEMBER" | "GUEST">("MEMBER");
  const [resolvedMember, setResolvedMember] = useState<ResolvedMember | null>(null);
  const [guestName, setGuestName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "UPI">("CASH");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Slot Detail / Staff Cancel Modal
  const [inspectBooking, setInspectBooking] = useState<{
    id: string;
    courtName: string;
    playerName: string;
    startTime: string;
    endTime: string;
    status: string;
    price: number;
  } | null>(null);

  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Navigate Date
  const handleDateChange = (newDateStr: string) => {
    setCurrentDate(newDateStr);
    router.push(`/admin/courts?date=${newDateStr}`);
  };

  const handlePrevDay = () => {
    const d = new Date(`${currentDate}T12:00:00Z`);
    d.setDate(d.getDate() - 1);
    handleDateChange(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(`${currentDate}T12:00:00Z`);
    d.setDate(d.getDate() + 1);
    handleDateChange(d.toISOString().slice(0, 10));
  };

  // Selected member discount calculation
  const discountPct = bookingType === "MEMBER" ? resolvedMember?.courtDiscountPct || 0 : 0;
  const basePrice = selectedSlot?.basePrice || 1000;
  const discountAmt = (basePrice * discountPct) / 100;
  const netPayable = Math.max(0, basePrice - discountAmt);

  // Handle Submit Booking
  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    if (bookingType === "MEMBER" && !resolvedMember) {
      setBookingError("Please verify member ID first.");
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    const formData = new FormData();
    formData.set("courtId", selectedSlot.courtId);
    formData.set("startsAt", selectedSlot.startsAt);
    formData.set("endsAt", selectedSlot.endsAt);
    if (bookingType === "MEMBER") {
      formData.set("memberId", resolvedMember!.id);
    } else {
      formData.set("guestName", guestName || "Walk-in Guest");
    }
    formData.set("paymentMethod", paymentMethod);

    const res = await bookAndConfirmAction(formData);

    if (!res.success) {
      setBookingError(res.error || "Booking failed.");
      setBookingLoading(false);
      return;
    }

    setBookingSuccess("Court reserved and confirmed successfully!");
    setBookingLoading(false);
    setTimeout(() => {
      setSelectedSlot(null);
      setBookingSuccess(null);
      router.refresh();
    }, 1200);
  };

  // Handle Staff Cancellation
  const handleStaffCancel = async () => {
    if (!inspectBooking) return;
    if (!cancelReason.trim()) {
      setCancelError("A valid cancellation reason is required.");
      return;
    }

    setCancelLoading(true);
    setCancelError(null);

    const formData = new FormData();
    formData.set("bookingId", inspectBooking.id);
    formData.set("reason", cancelReason);

    const res = await cancelStaffBookingAction(formData);

    if (!res.success) {
      setCancelError(res.error || "Failed to cancel booking.");
      setCancelLoading(false);
      return;
    }

    setCancelLoading(false);
    setInspectBooking(null);
    setCancelReason("");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Date Controls & Quick Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Court Availability Matrix</h1>
            <p className="text-xs text-muted-foreground">
              60-min sessions • Every 30 min • Club Hours: {data.operatingHours.open} - {data.operatingHours.close} IST
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevDay} className="h-8 px-2 text-xs">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Input
            type="date"
            value={currentDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-8 text-xs font-semibold w-36 text-center"
          />

          <Button variant="outline" size="sm" onClick={handleNextDay} className="h-8 px-2 text-xs">
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDateChange(new Date().toISOString().slice(0, 10))}
            className="h-8 text-xs font-semibold ml-1"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500"></span>
          <span className="text-muted-foreground font-medium">Available (Click to Book)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-500/20 border border-amber-500"></span>
          <span className="text-muted-foreground font-medium">Held (5m Temporary Lock)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-500/20 border border-blue-500"></span>
          <span className="text-muted-foreground font-medium">Confirmed Session</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-purple-500/20 border border-purple-500"></span>
          <span className="text-muted-foreground font-medium">Friday Social Play</span>
        </div>
      </div>

      {/* Day View Availability Grid */}
      <Card className="shadow-sm overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b bg-muted/60 text-muted-foreground font-semibold">
                <th className="p-3 w-24 sticky left-0 bg-muted/90 backdrop-blur z-10 border-r text-center">
                  Time (IST)
                </th>
                {data.courts.map((court) => (
                  <th key={court.id} className="p-3 min-w-[160px] border-r last:border-r-0">
                    <div className="font-bold text-foreground text-xs">{court.name}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">
                      {court.sport} • Base ₹{court.basePrice}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.slotKey} className="border-b hover:bg-muted/20 transition-colors">
                  {/* Time Column */}
                  <td className="p-2.5 font-mono text-center font-semibold text-foreground sticky left-0 bg-card border-r z-10 text-[11px]">
                    <div>{row.startTimeStr}</div>
                    <div className="text-[9px] text-muted-foreground font-normal">{row.endTimeStr}</div>
                  </td>

                  {/* Court Cells */}
                  {row.courts.map((cell) => {
                    const court = data.courts.find((c) => c.id === cell.courtId)!;

                    if (cell.status === "FREE") {
                      return (
                        <td
                          key={cell.courtId}
                          onClick={() => {
                            setSelectedSlot({
                              courtId: court.id,
                              courtName: court.name,
                              sport: court.sport,
                              basePrice: court.basePrice,
                              startTime: row.startTimeStr,
                              endTime: row.endTimeStr,
                              startsAt: row.startsAt,
                              endsAt: row.endsAt,
                            });
                          }}
                          className="p-2 border-r last:border-r-0 cursor-pointer group"
                        >
                          <div className="h-12 rounded-lg border border-dashed border-emerald-400/50 bg-emerald-500/5 hover:bg-emerald-500/20 hover:border-emerald-500 p-2 flex flex-col justify-between transition-all">
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                              Available
                            </span>
                            <span className="text-[9px] text-muted-foreground group-hover:text-foreground">
                              ₹{court.basePrice} / 60m
                            </span>
                          </div>
                        </td>
                      );
                    }

                    if (cell.status === "HELD") {
                      return (
                        <td key={cell.courtId} className="p-2 border-r last:border-r-0">
                          <div className="h-12 rounded-lg border border-amber-400 bg-amber-500/15 p-2 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> HELD (5m Lock)
                            </span>
                            <span className="text-[9px] text-muted-foreground truncate">
                              {cell.booking?.memberName || cell.booking?.guestName || "Pending Confirm"}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    if (cell.status === "SOCIAL") {
                      return (
                        <td key={cell.courtId} className="p-2 border-r last:border-r-0">
                          <div className="h-12 rounded-lg border border-purple-400 bg-purple-500/15 p-2 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-purple-800 dark:text-purple-200 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Social Play
                            </span>
                            <span className="text-[9px] text-purple-700 font-semibold">
                              {cell.booking?.participantCount || 0}/{cell.booking?.capacity || 4} Joined
                            </span>
                          </div>
                        </td>
                      );
                    }

                    // CONFIRMED
                    return (
                      <td
                        key={cell.courtId}
                        onClick={() => {
                          if (cell.booking?.id) {
                            setInspectBooking({
                              id: cell.booking.id,
                              courtName: court.name,
                              playerName: cell.booking.memberName || cell.booking.guestName || "Player",
                              startTime: row.startTimeStr,
                              endTime: row.endTimeStr,
                              status: cell.booking.status || "CONFIRMED",
                              price: (cell.booking.priceSnapshot || 0) - (cell.booking.discountSnapshot || 0),
                            });
                          }
                        }}
                        className="p-2 border-r last:border-r-0 cursor-pointer"
                      >
                        <div className="h-12 rounded-lg border border-blue-500 bg-blue-500/15 p-2 flex flex-col justify-between hover:scale-[1.02] transition-transform shadow-xs">
                          <span className="text-[10px] font-bold text-blue-900 dark:text-blue-100 truncate">
                            {cell.booking?.memberName || cell.booking?.guestName}
                          </span>
                          <div className="flex justify-between items-center text-[9px] text-blue-700 dark:text-blue-300">
                            <span>{cell.booking?.membershipNo || "Walk-in"}</span>
                            <span className="font-semibold">CONFIRMED</span>
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Booking Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <Card className="w-full max-w-md shadow-2xl border bg-card">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <Badge className="bg-emerald-600 text-white text-[10px] mb-1">
                    {selectedSlot.sport} • 60 MIN SESSION
                  </Badge>
                  <CardTitle className="text-base font-bold text-foreground">
                    Reserve {selectedSlot.courtName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Time: {selectedSlot.startTime} - {selectedSlot.endTime} IST ({currentDate})
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSlot(null);
                    setBookingError(null);
                  }}
                  className="h-7 w-7 p-0"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              {bookingError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              {bookingSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 font-medium rounded-md flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{bookingSuccess}</span>
                </div>
              )}

              {/* Booking Type Toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Player Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={bookingType === "MEMBER" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBookingType("MEMBER")}
                    className="text-xs h-8"
                  >
                    <Trophy className="h-3 w-3 mr-1" /> Club Member
                  </Button>
                  <Button
                    type="button"
                    variant={bookingType === "GUEST" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBookingType("GUEST")}
                    className="text-xs h-8"
                  >
                    <User className="h-3 w-3 mr-1" /> Walk-in Guest
                  </Button>
                </div>
              </div>

              {/* Player Selection */}
              {bookingType === "MEMBER" ? (
                <MemberIdInput
                  onMemberResolved={setResolvedMember}
                  showBookingsLeft={true}
                />
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="guestNameInput" className="text-xs font-semibold">Guest Full Name</Label>
                  <Input
                    id="guestNameInput"
                    placeholder="e.g. Rahul Dravid"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              )}

              {/* Price Breakdown Preview */}
              <div className="p-3 bg-muted/50 rounded-lg border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Standard Court Rate:</span>
                  <span className="font-medium">₹{basePrice}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Member Privilege ({discountPct}% OFF):</span>
                    <span>-₹{discountAmt.toFixed(0)}</span>
                  </div>
                )}
                <div className="border-t pt-1.5 flex justify-between font-bold text-foreground text-sm">
                  <span>Net Payable Amount:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    ₹{netPayable.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Settlement Method</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["CASH", "CARD", "UPI"] as const).map((method) => (
                    <Button
                      key={method}
                      type="button"
                      variant={paymentMethod === method ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaymentMethod(method)}
                      className="text-[11px] h-7"
                    >
                      {method}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                <Button
                  onClick={handleConfirmBooking}
                  disabled={bookingLoading || (bookingType === "MEMBER" && !resolvedMember)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 disabled:opacity-50"
                >
                  {bookingLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying slot...
                    </span>
                  ) : (
                    `Confirm & Collect ₹${netPayable.toFixed(0)}`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Booking Details & Staff Cancel Dialog */}
      {inspectBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <Card className="w-full max-w-sm shadow-2xl border bg-card">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <Badge className="bg-blue-600 text-white text-[10px] mb-1">CONFIRMED SESSION</Badge>
                  <CardTitle className="text-base font-bold text-foreground">
                    {inspectBooking.courtName}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Player: <strong>{inspectBooking.playerName}</strong> • {inspectBooking.startTime} - {inspectBooking.endTime} IST
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInspectBooking(null);
                    setCancelError(null);
                  }}
                  className="h-7 w-7 p-0"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              {cancelError && (
                <div className="p-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded font-medium">
                  {cancelError}
                </div>
              )}

              <div className="p-3 bg-muted/40 rounded border space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session Fee Paid:</span>
                  <span className="font-semibold text-foreground">₹{inspectBooking.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="text-[10px]">{inspectBooking.status}</Badge>
                </div>
              </div>

              {/* Staff Cancellation Section */}
              <div className="space-y-2 border-t pt-3">
                <Label htmlFor="reason" className="text-xs font-semibold flex items-center gap-1.5 text-destructive">
                  <ShieldAlert className="h-3.5 w-3.5" /> Staff Cancellation Override
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Staff may cancel at any time. The cancellation reason is saved on the booking record.
                </p>
                <Input
                  id="reason"
                  placeholder="e.g. Court maintenance floodlight repair"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="text-xs h-8"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStaffCancel}
                  disabled={cancelLoading}
                  className="w-full text-xs h-8 font-semibold mt-1"
                >
                  {cancelLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" /> Cancelling...
                    </span>
                  ) : (
                    "Authorize Cancellation & Refund"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
