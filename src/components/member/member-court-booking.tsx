"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { bookMemberCourtAction } from "@/app/actions/bookings";
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  X,
  Zap,
} from "lucide-react";
import { format, addDays, parseISO, isToday } from "date-fns";

/* ------------------------------------------------------------------ */
/*  Types                                                                */
/* ------------------------------------------------------------------ */
interface CourtCol {
  id: string;
  name: string;
  sport: string;
  surface?: string;
  capacity: number;
  basePrice: number;
}

interface SlotRow {
  slotKey: string;
  startTimeStr: string;
  endTimeStr: string;
  startsAt: string;
  endsAt: string;
  courtSlots: Array<{
    courtId: string;
    status: "FREE" | "HELD" | "CONFIRMED";
    bookingId?: string | null;
  }>;
}

interface Props {
  initialDate: string;
  courts: CourtCol[];
  slots: SlotRow[];
  discountPct: number;
  bookingsLeftToday: number;
  planName?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */
const SPORTS = ["All", "Badminton", "Padel", "Tennis"] as const;
type SportFilter = (typeof SPORTS)[number];

const SPORT_EMOJI: Record<string, string> = {
  All: "",
  Badminton: "",
  Padel: "",
  Tennis: "",
};

function fmtDateLabel(isoDate: string) {
  const d = parseISO(isoDate);
  return {
    dayName: format(d, "EEE"),
    dayNum: format(d, "d"),
    monthShort: format(d, "MMM"),
    full: format(d, "dd MMM yyyy"),
    isToday: isToday(d),
  };
}

function slotPeriod(timeStr: string): "Morning" | "Afternoon" | "Evening" {
  const [hStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

function isPastTime(startsAt: string, selectedDate: string): boolean {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  if (selectedDate !== todayStr) return false;
  return new Date(startsAt) < now;
}

function memberPrice(basePrice: number, pct: number) {
  return Math.round(basePrice * (1 - pct / 100));
}

function fmtRs(n: number) {
  return "Rs " + n.toLocaleString("en-IN");
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */
export function MemberCourtBooking({
  initialDate,
  courts,
  slots,
  discountPct,
  bookingsLeftToday,
  planName,
}: Props) {
  const router = useRouter();

  /* ---- Step state ---- */
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [sportFilter, setSportFilter] = useState<SportFilter>("All");
  const [selectedTime, setSelectedTime] = useState<string | null>(null); // slotKey
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [showConfirm, setShowConfirm] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ---- Derived: filtered courts ---- */
  const filteredCourts = useMemo(
    () =>
      sportFilter === "All"
        ? courts
        : courts.filter(
            (c) => c.sport.toLowerCase() === sportFilter.toLowerCase()
          ),
    [courts, sportFilter]
  );

  /* ---- Derived: free-count per slot (filtered by sport) ---- */
  const slotFreeCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of slots) {
      if (isPastTime(row.startsAt, selectedDate)) continue;
      map[row.slotKey] = row.courtSlots.filter(
        (cs) =>
          cs.status === "FREE" &&
          filteredCourts.some((c) => c.id === cs.courtId)
      ).length;
    }
    return map;
  }, [slots, filteredCourts, selectedDate]);

  /* ---- Derived: selected slot row ---- */
  const selectedSlotRow = useMemo(
    () => slots.find((s) => s.slotKey === selectedTime) ?? null,
    [slots, selectedTime]
  );

  /* ---- Derived: free courts for selected time ---- */
  const freeCourtsForTime = useMemo(() => {
    if (!selectedSlotRow) return [];
    return filteredCourts.filter((c) => {
      const cs = selectedSlotRow.courtSlots.find((s) => s.courtId === c.id);
      return cs?.status === "FREE";
    });
  }, [selectedSlotRow, filteredCourts]);

  /* ---- Derived: selected court ---- */
  const selectedCourt = useMemo(
    () => courts.find((c) => c.id === selectedCourtId) ?? null,
    [courts, selectedCourtId]
  );

  /* ---- Grouped periods ---- */
  const periods = useMemo(() => {
    const groups: Record<"Morning" | "Afternoon" | "Evening", SlotRow[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    for (const row of slots) {
      if (isPastTime(row.startsAt, selectedDate)) continue;
      groups[slotPeriod(row.startTimeStr)].push(row);
    }
    return groups;
  }, [slots, selectedDate]);

  /* ---- Date strip (14 days) ---- */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStrip = Array.from({ length: 14 }, (_, i) =>
    format(addDays(today, i), "yyyy-MM-dd")
  );

  /* ---- Handlers ---- */
  function handleDateChange(d: string) {
    setSelectedDate(d);
    setSelectedTime(null);
    setSelectedCourtId(null);
    setShowConfirm(false);
    setError(null);
    router.push(`/member/book?date=${d}`);
  }

  function handleTimeSelect(slotKey: string) {
    if (slotFreeCount[slotKey] === 0) return;
    setSelectedTime(slotKey === selectedTime ? null : slotKey);
    setSelectedCourtId(null);
    setShowConfirm(false);
    setError(null);
  }

  function handleCourtSelect(courtId: string) {
    setSelectedCourtId(courtId);
    setShowConfirm(true);
    setError(null);
  }

  function handleConfirmBooking() {
    if (!selectedSlotRow || !selectedCourtId) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("courtId", selectedCourtId);
      formData.set("startsAt", selectedSlotRow.startsAt);
      formData.set("endsAt", selectedSlotRow.endsAt);
      formData.set("paymentMethod", paymentMethod);

      const res = await bookMemberCourtAction(formData);

      if (!res.success) {
        const msg = res.error || "Failed to book this slot.";
        if (msg.toLowerCase().includes("already booked") || msg.toLowerCase().includes("overlap")) {
          setError("That court was just booked. Please choose another court or time.");
        } else if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("limit")) {
          setError("You've reached your daily booking limit. No more bookings allowed today.");
        } else {
          setError(msg);
        }
        setShowConfirm(false);
        router.refresh();
        return;
      }

      setSuccess(
        `Booked! ${selectedCourt?.name} at ${selectedSlotRow.startTimeStr}–${selectedSlotRow.endTimeStr} on ${fmtDateLabel(selectedDate).full}`
      );
      setSelectedTime(null);
      setSelectedCourtId(null);
      setShowConfirm(false);
      router.refresh();
    });
  }

  /* ================================================================ */
  /*  Render                                                             */
  /* ================================================================ */
  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-16">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-[#5F9E4A]" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#1B1B1B]">Court Reserved!</h2>
        <p className="text-sm text-[#1B1B1B]/70">{success}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            prefetch={false}
            href="/member/bookings"
            className="px-6 py-3 rounded-full bg-[#5F9E4A] text-white font-bold text-sm"
          >
            View my bookings
          </Link>
          <button
            onClick={() => setSuccess(null)}
            className="px-6 py-3 rounded-full border border-[#1B1B1B]/20 text-[#1B1B1B] font-bold text-sm cursor-pointer"
          >
            Book another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      {/* Daily limit banner */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[#1B1B1B]/70 bg-white border border-[#1B1B1B]/10 px-4 py-2.5 rounded-2xl w-fit">
        <Zap className="h-3.5 w-3.5 text-[#5F9E4A]" />
        {bookingsLeftToday > 0
          ? `You can book ${bookingsLeftToday} more session${bookingsLeftToday > 1 ? "s" : ""} today`
          : "You've used all your booking slots for today"}
        {planName && <span className="text-[#E8883A] ml-1">· {planName}</span>}
      </div>

      {bookingsLeftToday === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          You have reached your daily booking limit. Come back tomorrow or upgrade your plan for more slots.
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ---- STEP 1: Sport filter ---- */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1B1B1B]/50">
          Step 1 — Choose sport
        </h2>
        <div className="flex gap-2 flex-wrap">
          {SPORTS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSportFilter(s);
                setSelectedTime(null);
                setSelectedCourtId(null);
              }}
              className={`min-h-[44px] px-4 py-2 rounded-2xl border text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                sportFilter === s
                  ? "bg-[#5F9E4A] border-[#5F9E4A] text-white shadow"
                  : "bg-white border-[#1B1B1B]/15 text-[#1B1B1B] hover:border-[#5F9E4A]"
              }`}
            >
              <span>{SPORT_EMOJI[s]}</span>
              {s}
            </button>
          ))}
        </div>
      </section>

      {/* ---- STEP 2: Date strip ---- */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1B1B1B]/50">
          Step 2 — Pick a date
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {dateStrip.map((d) => {
            const lbl = fmtDateLabel(d);
            const isSelected = d === selectedDate;
            return (
              <button
                key={d}
                onClick={() => handleDateChange(d)}
                className={`min-w-[56px] min-h-[72px] flex flex-col items-center justify-center rounded-2xl border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-[#5F9E4A] border-[#5F9E4A] text-white shadow"
                    : lbl.isToday
                    ? "bg-white border-[#5F9E4A] text-[#5F9E4A]"
                    : "bg-white border-[#1B1B1B]/15 text-[#1B1B1B] hover:border-[#5F9E4A]"
                }`}
              >
                <span className="text-[10px] font-bold uppercase">{lbl.dayName}</span>
                <span className="text-xl font-extrabold leading-tight">{lbl.dayNum}</span>
                <span className="text-[10px]">{lbl.monthShort}</span>
                {lbl.isToday && !isSelected && (
                  <span className="mt-0.5 text-[8px] font-black uppercase tracking-widest text-[#5F9E4A]">
                    Today
                  </span>
                )}
              </button>
            );
          })}
          {/* More dates: native date picker */}
          <label className="min-w-[56px] min-h-[72px] flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#1B1B1B]/20 text-xs text-[#1B1B1B]/50 cursor-pointer hover:border-[#5F9E4A] shrink-0 relative">
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-[9px]">More</span>
            <input
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer"
              min={format(today, "yyyy-MM-dd")}
              onChange={(e) => e.target.value && handleDateChange(e.target.value)}
            />
          </label>
        </div>
        <p className="text-[11px] text-[#1B1B1B]/50 font-medium">
          {fmtDateLabel(selectedDate).full}
        </p>
      </section>

      {/* ---- STEP 3: Time chips ---- */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#1B1B1B]/50">
          Step 3 — Select a time
        </h2>
        {(["Morning", "Afternoon", "Evening"] as const).map((period) => {
          const rows = periods[period];
          if (!rows.length) return null;
          return (
            <div key={period} className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
                {period}
              </p>
              <div className="flex flex-wrap gap-2">
                {rows.map((row) => {
                  const freeCount = slotFreeCount[row.slotKey] ?? 0;
                  const isFull = freeCount === 0;
                  const isSelected = row.slotKey === selectedTime;

                  return (
                    <button
                      key={row.slotKey}
                      disabled={isFull || bookingsLeftToday === 0}
                      onClick={() => handleTimeSelect(row.slotKey)}
                      className={`min-h-[44px] px-4 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#5F9E4A] border-[#5F9E4A] text-white shadow"
                          : isFull
                          ? "bg-[#F6F5E1] border-[#1B1B1B]/10 text-[#1B1B1B]/30 line-through cursor-not-allowed"
                          : "bg-white border-[#1B1B1B]/20 text-[#1B1B1B] hover:border-[#5F9E4A]"
                      } disabled:opacity-60`}
                    >
                      {row.startTimeStr}
                      {!isFull && (
                        <span
                          className={`ml-1.5 ${isSelected ? "text-white/80" : "text-[#5F9E4A]"} font-normal`}
                        >
                          · {freeCount} free
                        </span>
                      )}
                      {isFull && <span className="ml-1.5 text-[#1B1B1B]/30 font-normal">· Full</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {Object.values(periods).every((r) => r.length === 0) && (
          <p className="text-sm text-[#1B1B1B]/50 py-2">
            No available slots on this date. Try another day.
          </p>
        )}
      </section>

      {/* ---- STEP 4: Court cards (shown after time is selected) ---- */}
      {selectedTime && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#1B1B1B]/50">
            Step 4 — Choose a court
          </h2>
          {freeCourtsForTime.length === 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              All courts are fully booked at this time. Please pick a different time.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {freeCourtsForTime.map((court) => {
                const memberP = memberPrice(court.basePrice, discountPct);
                const isChosen = court.id === selectedCourtId;
                return (
                  <button
                    key={court.id}
                    onClick={() => handleCourtSelect(court.id)}
                    className={`text-left p-5 rounded-2xl border transition-all cursor-pointer ${
                      isChosen
                        ? "bg-[#5F9E4A]/10 border-[#5F9E4A] ring-2 ring-[#5F9E4A]/30"
                        : "bg-white border-[#1B1B1B]/15 hover:border-[#5F9E4A]"
                    }`}
                  >
                    <div className="text-base font-extrabold text-[#1B1B1B]">{court.name}</div>
                    <div className="text-xs text-[#1B1B1B]/50 mt-0.5">
                      {court.sport} {court.surface ? `· ${court.surface}` : ""}
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      {discountPct > 0 ? (
                        <>
                          <span className="text-lg font-extrabold text-[#5F9E4A]">
                            {fmtRs(memberP)}
                          </span>
                          <span className="text-xs text-[#1B1B1B]/40 line-through">
                            {fmtRs(court.basePrice)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-extrabold text-[#1B1B1B]">
                          {fmtRs(court.basePrice)}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 w-full py-2 rounded-xl bg-[#5F9E4A] text-white text-xs font-bold text-center">
                      {isChosen ? "Selected ✓" : "Book this court"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ---- Confirm Dialog ---- */}
      {showConfirm && selectedSlotRow && selectedCourt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-md bg-[#F6F5E1] rounded-3xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-[#1B1B1B]">Confirm booking</h3>
              <button
                onClick={() => { setShowConfirm(false); setSelectedCourtId(null); }}
                className="h-8 w-8 rounded-full border border-[#1B1B1B]/20 flex items-center justify-center cursor-pointer hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-white rounded-2xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#1B1B1B]/60">Court</span>
                <span className="font-bold">{selectedCourt.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#1B1B1B]/60">Date</span>
                <span className="font-bold">{fmtDateLabel(selectedDate).full}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#1B1B1B]/60">Time</span>
                <span className="font-bold">
                  {selectedSlotRow.startTimeStr} – {selectedSlotRow.endTimeStr} (60 min)
                </span>
              </div>
              <div className="border-t border-[#1B1B1B]/10 pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-[#1B1B1B]/60">
                  <span>Base price</span>
                  <span>{fmtRs(selectedCourt.basePrice)}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-[#5F9E4A] font-semibold">
                    <span>{planName || "Member"} {discountPct}% off</span>
                    <span>−{fmtRs(Math.round(selectedCourt.basePrice * discountPct / 100))}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-[#1B1B1B] text-base pt-1 border-t border-[#1B1B1B]/10">
                  <span>Total</span>
                  <span>{fmtRs(memberPrice(selectedCourt.basePrice, discountPct))}</span>
                </div>
              </div>
            </div>

            {/* Daily limit */}
            <p className="text-xs text-[#1B1B1B]/60 text-center">
              You have booked <span className="font-bold text-[#1B1B1B]">
                {(planName?.toUpperCase() === "GOLD" ? 4 : 2) - bookingsLeftToday}
              </span> of{" "}
              <span className="font-bold text-[#1B1B1B]">
                {planName?.toUpperCase() === "GOLD" ? 4 : 2}
              </span> sessions today
            </p>

            {/* Payment method */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-[#1B1B1B]/50">
                Payment at club
              </p>
              <div className="flex gap-2">
                {(["CASH", "UPI", "CARD"] as const).map((pm) => (
                  <button
                    key={pm}
                    onClick={() => setPaymentMethod(pm)}
                    className={`flex-1 min-h-[40px] rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === pm
                        ? "bg-[#1B1B1B] text-[#F6F5E1] border-[#1B1B1B]"
                        : "bg-white border-[#1B1B1B]/20 text-[#1B1B1B] hover:border-[#1B1B1B]"
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={isPending}
              className="w-full min-h-[52px] rounded-2xl bg-[#5F9E4A] text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  Confirm booking <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---- Mobile sticky bottom bar ---- */}
      {selectedTime && !showConfirm && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-[#F6F5E1] border-t border-[#1B1B1B]/15 px-4 py-3 flex items-center justify-between gap-3 z-40">
          <div className="text-sm">
            <span className="font-bold text-[#1B1B1B]">
              {selectedSlotRow?.startTimeStr} – {selectedSlotRow?.endTimeStr}
            </span>
            <span className="ml-2 text-xs text-[#1B1B1B]/60">· {fmtDateLabel(selectedDate).full}</span>
          </div>
          {selectedCourtId ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-5 py-2.5 rounded-full bg-[#5F9E4A] text-white font-bold text-sm cursor-pointer"
            >
              Continue
            </button>
          ) : (
            <span className="text-xs text-[#1B1B1B]/50">Pick a court above</span>
          )}
        </div>
      )}
    </div>
  );
}
