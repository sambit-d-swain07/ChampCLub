"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  bookAndConfirmAction, 
  cancelStaffBookingAction 
} from "@/app/actions/bookings";
import {
  addCourtAction,
  editCourtAction,
  checkCourtFutureBookingsAction,
  deleteCourtAction,
} from "@/app/actions/courts";
import { MemberListItem } from "@/lib/services/members";
import { MemberIdInput, ResolvedMember } from "@/components/admin/member-id-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatInrPrecise } from "@/lib/site-settings";

function format12Hour(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function formatSessionRange(startTimeStr: string, endTimeStr: string): string {
  const start = format12Hour(startTimeStr);
  const end = format12Hour(endTimeStr);
  const [startT, startAmPm] = start.split(" ");
  const [endT, endAmPm] = end.split(" ");
  if (startT === "11:00" && endT === "12:00") {
    return "11:00 – 12:00 pm";
  }
  if (startAmPm === endAmPm) {
    return `${startT} – ${endT} ${endAmPm}`;
  }
  return `${start} – ${end}`;
}
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  MoreVertical,
  Plus,
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
  isOwner?: boolean;
  pricingBySport?: Record<string, number>;
}

export function CourtScheduleGrid({
  initialDate,
  data,
  members = [],
  isOwner = false,
  pricingBySport = { TENNIS: 1200, PADEL: 1600, BADMINTON: 600 },
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

  // Owner Court CRUD Modals
  const [addCourtOpen, setAddCourtOpen] = useState(false);
  const [addCourtName, setAddCourtName] = useState("");
  const [addCourtSport, setAddCourtSport] = useState<"TENNIS" | "PADEL" | "BADMINTON">("TENNIS");
  const [addCourtCapacity, setAddCourtCapacity] = useState(4);
  const [addCourtError, setAddCourtError] = useState<string | null>(null);
  const [addCourtLoading, setAddCourtLoading] = useState(false);

  // Edit Court Modal
  const [editCourt, setEditCourt] = useState<{ id: string; name: string; capacity: number } | null>(null);
  const [editCourtError, setEditCourtError] = useState<string | null>(null);
  const [editCourtLoading, setEditCourtLoading] = useState(false);

  // Delete / Archive Court Modal
  const [deleteCourtTarget, setDeleteCourtTarget] = useState<{ id: string; name: string; futureCount: number } | null>(null);
  const [deleteCourtLoading, setDeleteCourtLoading] = useState(false);
  const [deleteCourtError, setDeleteCourtError] = useState<string | null>(null);

  // Column Menu dropdown active ID
  const [activeMenuCourtId, setActiveMenuCourtId] = useState<string | null>(null);

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

  const discountPct = bookingType === "MEMBER" ? resolvedMember?.courtDiscountPct || 0 : 0;

  // Handle Instant Booking Confirmation
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    if (bookingType === "MEMBER" && !resolvedMember) {
      setBookingError("Please enter and verify a valid Member ID.");
      return;
    }

    if (bookingType === "GUEST" && !guestName.trim()) {
      setBookingError("Please enter a guest name.");
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    const formData = new FormData();
    formData.append("courtId", selectedSlot.courtId);
    formData.append("startsAt", selectedSlot.startsAt);
    formData.append("endsAt", selectedSlot.endsAt);
    formData.append("paymentMethod", paymentMethod);

    if (bookingType === "MEMBER" && resolvedMember) {
      formData.append("memberId", resolvedMember.id);
    } else {
      formData.append("guestName", guestName.trim() || "Walk-in Guest");
    }

    const res = await bookAndConfirmAction(formData);
    setBookingLoading(false);

    if (!res.success) {
      setBookingError(res.error || "Failed to confirm court booking.");
      return;
    }

    setBookingSuccess("Court booking confirmed and recorded to the ledger.");
    setTimeout(() => {
      setSelectedSlot(null);
      setBookingSuccess(null);
      setResolvedMember(null);
      setGuestName("");
      router.refresh();
    }, 1200);
  };

  // Handle Staff Cancellation
  const handleStaffCancel = async () => {
    if (!inspectBooking) return;
    if (!cancelReason.trim()) {
      setCancelError("A reason is required to cancel a confirmed booking.");
      return;
    }

    setCancelLoading(true);
    setCancelError(null);

    const formData = new FormData();
    formData.append("bookingId", inspectBooking.id);
    formData.append("reason", cancelReason.trim());

    const res = await cancelStaffBookingAction(formData);
    setCancelLoading(false);

    if (!res.success) {
      setCancelError(res.error || "Failed to cancel booking.");
      return;
    }

    setInspectBooking(null);
    setCancelReason("");
    router.refresh();
  };

  // Handle Add Court Submit
  const handleAddCourtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCourtName.trim()) {
      setAddCourtError("Court name is required.");
      return;
    }

    setAddCourtLoading(true);
    setAddCourtError(null);

    const res = await addCourtAction({
      name: addCourtName.trim(),
      sport: addCourtSport,
      capacity: Number(addCourtCapacity),
    });

    setAddCourtLoading(false);

    if (!res.success) {
      setAddCourtError(res.error || "Failed to add court.");
      return;
    }

    setAddCourtOpen(false);
    setAddCourtName("");
    setAddCourtSport("TENNIS");
    setAddCourtCapacity(4);
    router.refresh();
  };

  // Handle Edit Court Submit
  const handleEditCourtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourt) return;
    if (!editCourt.name.trim()) {
      setEditCourtError("Court name is required.");
      return;
    }

    setEditCourtLoading(true);
    setEditCourtError(null);

    const res = await editCourtAction({
      courtId: editCourt.id,
      name: editCourt.name.trim(),
      capacity: Number(editCourt.capacity),
    });

    setEditCourtLoading(false);

    if (!res.success) {
      setEditCourtError(res.error || "Failed to update court.");
      return;
    }

    setEditCourt(null);
    router.refresh();
  };

  // Open Delete Confirmation
  const handleOpenDelete = async (courtId: string, courtName: string) => {
    setActiveMenuCourtId(null);
    const res = await checkCourtFutureBookingsAction(courtId);
    setDeleteCourtTarget({
      id: courtId,
      name: courtName,
      futureCount: res.futureCount || 0,
    });
  };

  // Confirm Delete / Archive
  const handleConfirmDelete = async () => {
    if (!deleteCourtTarget) return;

    setDeleteCourtLoading(true);
    setDeleteCourtError(null);

    const res = await deleteCourtAction(deleteCourtTarget.id);
    setDeleteCourtLoading(false);

    if (!res.success) {
      setDeleteCourtError(res.error || "Failed to delete court.");
      return;
    }

    setDeleteCourtTarget(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Date Controls & Quick Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-[#E2E8F0] p-4 rounded-lg shadow-none">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">Court Availability Matrix</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            60-min sessions • Every 30 min • Club Hours: {data.operatingHours.open} - {data.operatingHours.close} IST
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Owner Add Court Button */}
          {isOwner && (
            <Button
              size="sm"
              onClick={() => {
                setAddCourtError(null);
                setAddCourtOpen(true);
              }}
              className="h-8 text-xs font-semibold bg-[#23513C] text-white hover:bg-[#1b402f] mr-2"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Court
            </Button>
          )}

          {/* Date Selector */}
          <Button variant="outline" size="sm" onClick={handlePrevDay} className="h-8 px-2 text-xs border-[#E2E8F0]">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Input
            type="date"
            value={currentDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="h-8 text-xs font-semibold w-36 text-center border-[#E2E8F0]"
          />

          <Button variant="outline" size="sm" onClick={handleNextDay} className="h-8 px-2 text-xs border-[#E2E8F0]">
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateChange(new Date().toISOString().slice(0, 10))}
            className="h-8 text-xs font-semibold ml-1 border-[#E2E8F0]"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-50 border border-emerald-500"></span>
          <span className="text-[#64748B] font-medium">Available (Click to Book)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-50 border border-amber-500"></span>
          <span className="text-[#64748B] font-medium">Held (5m Temporary Lock)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-50 border border-blue-500"></span>
          <span className="text-[#64748B] font-medium">Confirmed Session</span>
        </div>
      </div>

      {/* Day View Availability Grid */}
      <Card className="shadow-none overflow-hidden border border-[#E2E8F0] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] font-semibold">
                <th className="p-3 w-24 sticky left-0 bg-[#F8FAFC] z-10 border-r border-[#E2E8F0] text-center">
                  Time (IST)
                </th>
                {data.courts.map((court) => (
                  <th key={court.id} className="p-3 min-w-[160px] border-r border-[#E2E8F0] last:border-r-0 relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#0F172A] text-xs">{court.name}</div>
                        <div className="text-[10px] text-[#64748B] font-normal">
                          {court.sport} • Base {formatInrPrecise(court.basePrice)}
                        </div>
                      </div>

                      {/* Owner Column Header Menu (Edit / Delete) */}
                      {isOwner && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuCourtId(activeMenuCourtId === court.id ? null : court.id)
                            }
                            className="p-1 rounded text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                            title="Court Options"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>

                          {activeMenuCourtId === court.id && (
                            <div className="absolute right-0 top-full mt-1 w-28 bg-white border border-[#E2E8F0] rounded shadow-md z-30 py-1 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuCourtId(null);
                                  setEditCourtError(null);
                                  setEditCourt({
                                    id: court.id,
                                    name: court.name,
                                    capacity: court.capacity,
                                  });
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-[#F8FAFC] text-[#0F172A]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(court.id, court.name)}
                                className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.slotKey} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
                  {/* Time Column */}
                  <td className="p-2.5 font-mono text-center font-semibold text-[#0F172A] sticky left-0 bg-white border-r border-[#E2E8F0] z-10 text-[11px]">
                    <div>{row.startTimeStr}</div>
                    <div className="text-[9px] text-[#64748B] font-normal">{row.endTimeStr}</div>
                  </td>

                  {/* Court Cells */}
                  {row.courts.map((cell) => {
                    const court = data.courts.find((c) => c.id === cell.courtId)!;
                    const isSelectedCourt = selectedSlot?.courtId === cell.courtId;
                    const isSelectedStart = isSelectedCourt && selectedSlot?.startsAt === row.startsAt;
                    const isSelectedCovered =
                      Boolean(isSelectedCourt &&
                      selectedSlot &&
                      new Date(row.startsAt).getTime() ===
                        new Date(selectedSlot.startsAt).getTime() + 30 * 60 * 1000);

                    if (isSelectedStart) {
                      return (
                        <td
                          key={cell.courtId}
                          aria-label={`Selected: ${formatSessionRange(selectedSlot.startTime, selectedSlot.endTime)}`}
                          className="p-2 border-r border-[#E2E8F0] last:border-r-0 cursor-pointer"
                        >
                          <div className="h-12 rounded-t-[10px] rounded-b-none border border-[#1F4A33] border-b-0 bg-[#1F4A33] p-1.5 flex flex-col justify-between text-white shadow-xs z-10">
                            <span className="text-[10px] font-bold text-white truncate">
                              {formatSessionRange(selectedSlot.startTime, selectedSlot.endTime)}
                            </span>
                            <span className="text-[9px] text-white/90 truncate">
                              {court.name}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    if (isSelectedCovered) {
                      return (
                        <td
                          key={cell.courtId}
                          aria-label={`Covered by session for ${court.name}`}
                          className="p-2 border-r border-[#E2E8F0] last:border-r-0 cursor-default"
                        >
                          <div className="h-12 rounded-b-[10px] rounded-t-none border border-[#1F4A33] border-t-0 bg-[#1F4A33] p-1.5 flex flex-col justify-end text-white shadow-xs z-10">
                            <span className="text-[9px] font-semibold text-emerald-200 tracking-wider uppercase">
                              60m Session
                            </span>
                          </div>
                        </td>
                      );
                    }

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
                          className="p-2 border-r border-[#E2E8F0] last:border-r-0 cursor-pointer group"
                        >
                          <div className="h-12 rounded border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-500 p-1.5 flex flex-col justify-between transition-all">
                            <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-800 leading-tight">
                              <span>Available</span>
                              <span className="font-mono text-[9px] text-emerald-700">
                                {formatSessionRange(row.startTimeStr, row.endTimeStr)}
                              </span>
                            </div>
                            <span className="text-[9px] text-[#64748B]">
                              {formatInrPrecise(court.basePrice)}
                            </span>
                          </div>
                        </td>
                      );
                    }

                    if (cell.status === "HELD") {
                      return (
                        <td key={cell.courtId} className="p-2 border-r border-[#E2E8F0] last:border-r-0">
                          <div className="h-12 rounded border border-amber-300 bg-amber-50 p-2 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> HELD (5m Lock)
                            </span>
                            <span className="text-[9px] text-[#64748B] truncate">
                              {cell.booking?.memberName || cell.booking?.guestName || "Pending Confirm"}
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
                              price: Number(cell.booking.priceSnapshot || court.basePrice),
                            });
                          }
                        }}
                        className="p-2 border-r border-[#E2E8F0] last:border-r-0 cursor-pointer"
                      >
                        <div className="h-12 rounded border border-blue-200 bg-blue-50 p-2 flex flex-col justify-between hover:border-blue-400 transition-all">
                          <span className="text-[10px] font-bold text-blue-900 truncate">
                            {cell.booking?.memberName || cell.booking?.guestName || "Booked"}
                          </span>
                          <span className="text-[9px] text-blue-700">
                            Confirmed Session
                          </span>
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

      {/* Add Court Modal (Owner Only) */}
      {addCourtOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Add New Court</h2>
              <button
                type="button"
                onClick={() => setAddCourtOpen(false)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            {addCourtError && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                {addCourtError}
              </div>
            )}

            <form onSubmit={handleAddCourtSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="courtName" className="text-xs font-semibold text-[#0F172A]">
                  Court Name
                </Label>
                <Input
                  id="courtName"
                  placeholder="e.g. Centre Court"
                  value={addCourtName}
                  onChange={(e) => setAddCourtName(e.target.value)}
                  className="h-9 text-xs border-[#E2E8F0]"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="courtSport" className="text-xs font-semibold text-[#0F172A]">
                  Sport
                </Label>
                <select
                  id="courtSport"
                  value={addCourtSport}
                  onChange={(e) => setAddCourtSport(e.target.value as any)}
                  className="w-full h-9 px-3 rounded border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-hidden"
                >
                  <option value="TENNIS">Tennis</option>
                  <option value="PADEL">Padel</option>
                  <option value="BADMINTON">Badminton</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="courtCapacity" className="text-xs font-semibold text-[#0F172A]">
                  Capacity (Players)
                </Label>
                <Input
                  id="courtCapacity"
                  type="number"
                  min="1"
                  max="10"
                  value={addCourtCapacity}
                  onChange={(e) => setAddCourtCapacity(parseInt(e.target.value, 10) || 1)}
                  className="h-9 text-xs border-[#E2E8F0]"
                  required
                />
              </div>

              <div className="space-y-1 bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] font-medium">Hourly Base Price:</span>
                <div className="text-sm font-bold text-[#0F172A]">
                  {formatInrPrecise(pricingBySport[addCourtSport] || 1000)} / 60m
                </div>
                <p className="text-[10px] text-[#64748B]">
                  Inherited directly from the {addCourtSport.toLowerCase()} pricing rule.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddCourtOpen(false)}
                  className="flex-1 text-xs border-[#E2E8F0]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addCourtLoading}
                  className="flex-1 text-xs bg-[#23513C] text-white hover:bg-[#1b402f]"
                >
                  {addCourtLoading ? "Creating..." : "Create Court"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Court Modal (Owner Only) */}
      {editCourt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-[#0F172A]">Edit Court</h2>
              <button
                type="button"
                onClick={() => setEditCourt(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            {editCourtError && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                {editCourtError}
              </div>
            )}

            <form onSubmit={handleEditCourtSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="editCourtName" className="text-xs font-semibold text-[#0F172A]">
                  Court Name
                </Label>
                <Input
                  id="editCourtName"
                  value={editCourt.name}
                  onChange={(e) => setEditCourt({ ...editCourt, name: e.target.value })}
                  className="h-9 text-xs border-[#E2E8F0]"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="editCourtCapacity" className="text-xs font-semibold text-[#0F172A]">
                  Capacity (Players)
                </Label>
                <Input
                  id="editCourtCapacity"
                  type="number"
                  min="1"
                  max="10"
                  value={editCourt.capacity}
                  onChange={(e) =>
                    setEditCourt({ ...editCourt, capacity: parseInt(e.target.value, 10) || 1 })
                  }
                  className="h-9 text-xs border-[#E2E8F0]"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditCourt(null)}
                  className="flex-1 text-xs border-[#E2E8F0]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editCourtLoading}
                  className="flex-1 text-xs bg-[#23513C] text-white hover:bg-[#1b402f]"
                >
                  {editCourtLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Court Modal */}
      {deleteCourtTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <h2 className="text-base font-bold text-red-600">Delete Court</h2>
              <button
                type="button"
                onClick={() => setDeleteCourtTarget(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            {deleteCourtError && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                {deleteCourtError}
              </div>
            )}

            <div className="space-y-3 text-xs text-[#0F172A]">
              <p>
                Are you sure you want to remove <strong>{deleteCourtTarget.name}</strong>?
              </p>

              {deleteCourtTarget.futureCount > 0 ? (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded space-y-2">
                  <div className="font-semibold text-amber-800 flex items-center gap-1.5">
                    <ShieldAlert className="h-4 w-4" />
                    {deleteCourtTarget.futureCount} upcoming booking(s) detected
                  </div>
                  <p className="text-[#64748B] text-[11px]">
                    Deleting this court will cancel all {deleteCourtTarget.futureCount} upcoming bookings
                    with the cancellation reason <em>&ldquo;Court removed&rdquo;</em> and record refund
                    entries to the financial ledger for paid amounts.
                  </p>
                </div>
              ) : (
                <p className="text-[#64748B]">
                  No upcoming bookings exist for this court. It will be hidden from member booking and
                  the availability matrix. Past booking history and reports remain intact.
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteCourtTarget(null)}
                className="flex-1 text-xs border-[#E2E8F0]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteCourtLoading}
                onClick={handleConfirmDelete}
                className="flex-1 text-xs font-semibold"
              >
                {deleteCourtLoading ? "Removing..." : "Confirm & Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Dialog */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Book Court Session</h2>
                <p className="text-xs text-[#64748B]">
                  {selectedSlot.courtName} • {selectedSlot.startTime} - {selectedSlot.endTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                {bookingError}
              </div>
            )}

            {bookingSuccess && (
              <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {bookingSuccess}
              </div>
            )}

            <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs">
              {/* Type Switcher */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBookingType("MEMBER");
                    setGuestName("");
                  }}
                  className={`flex-1 h-8 text-xs font-semibold rounded transition-colors ${
                    bookingType === "MEMBER"
                      ? "bg-[#23513C] text-white"
                      : "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  Club Member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBookingType("GUEST");
                    setResolvedMember(null);
                  }}
                  className={`flex-1 h-8 text-xs font-semibold rounded transition-colors ${
                    bookingType === "GUEST"
                      ? "bg-[#23513C] text-white"
                      : "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
                  }`}
                >
                  Guest
                </button>
              </div>

              {bookingType === "MEMBER" ? (
                <div className="space-y-1">
                  <MemberIdInput
                    onMemberResolved={(mem) => setResolvedMember(mem)}
                    placeholder="Enter Member ID (e.g. CC-1001)"
                  />
                  {discountPct > 0 && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                      {resolvedMember?.planName} discount active: {discountPct}% off court fees
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="guestName" className="text-xs font-semibold text-[#0F172A]">
                    Guest Name
                  </Label>
                  <Input
                    id="guestName"
                    placeholder="e.g. Rahul Sharma"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="h-8 text-xs border-[#E2E8F0]"
                    required
                  />
                </div>
              )}

              {/* Payment Method */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#0F172A]">Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CASH", "CARD", "UPI"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`h-8 text-xs font-semibold rounded transition-colors ${
                        paymentMethod === method
                          ? "bg-[#23513C] text-white"
                          : "bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee Summary */}
              <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] space-y-1">
                <div className="flex justify-between text-[#64748B]">
                  <span>Base Rate (60 mins):</span>
                  <span>{formatInrPrecise(selectedSlot.basePrice)}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Member Discount ({discountPct}%):</span>
                    <span>-{formatInrPrecise((selectedSlot.basePrice * discountPct) / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-[#0F172A] pt-1 border-t border-[#E2E8F0]">
                  <span>Total Amount:</span>
                  <span>
                    {formatInrPrecise(
                      selectedSlot.basePrice - (selectedSlot.basePrice * discountPct) / 100
                    )}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedSlot(null)}
                  className="flex-1 text-xs border-[#E2E8F0]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={bookingLoading}
                  className="flex-1 text-xs bg-[#23513C] text-white hover:bg-[#1b402f]"
                >
                  {bookingLoading ? "Processing..." : "Confirm & Pay"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect / Cancel Booking Modal */}
      {inspectBooking && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 border border-[#E2E8F0]">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F172A]">Court Session Details</h2>
                <p className="text-xs text-[#64748B]">
                  {inspectBooking.courtName} • {inspectBooking.startTime} - {inspectBooking.endTime}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectBooking(null)}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                ✕
              </button>
            </div>

            {cancelError && (
              <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded border border-red-200">
                {cancelError}
              </div>
            )}

            <div className="p-3 bg-[#F8FAFC] rounded border border-[#E2E8F0] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Player:</span>
                <span className="font-semibold text-[#0F172A]">{inspectBooking.playerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Session Fee Paid:</span>
                <span className="font-semibold text-[#0F172A]">{formatInrPrecise(inspectBooking.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Status:</span>
                <span className="font-medium text-blue-700">{inspectBooking.status}</span>
              </div>
            </div>

            {/* Staff Cancellation Section */}
            <div className="space-y-2 border-t border-[#E2E8F0] pt-3 text-xs">
              <Label htmlFor="cancelReason" className="text-xs font-semibold text-red-600 block">
                Cancellation Reason
              </Label>
              <Input
                id="cancelReason"
                placeholder="e.g. Maintenance or member requested refund"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="h-8 text-xs border-[#E2E8F0]"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStaffCancel}
                disabled={cancelLoading}
                className="w-full text-xs h-9 font-semibold"
              >
                {cancelLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cancelling...
                  </span>
                ) : (
                  "Cancel Booking & Refund"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
