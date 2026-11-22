"use client";

import { useState, useEffect, useTransition, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  format,
  addDays,
  parseISO,
  isToday,
  isBefore,
  isAfter,
  startOfDay,
  setHours,
  setMinutes,
  addMinutes,
} from "date-fns";
import {
  createMemberHoldAction,
  confirmMemberBookingAction,
  releaseMemberHoldAction,
} from "@/app/actions/bookings";

/* ------------------------------------------------------------------ */
/*  Types                                                                */
/* ------------------------------------------------------------------ */
export interface CourtItem {
  id: string;
  name: string;
  sport: string;
  capacity: number;
  basePrice: number;
  descriptor?: string;
}

export interface SlotCourtStatus {
  courtId: string;
  status: "FREE" | "HELD" | "CONFIRMED";
  bookingId?: string | null;
}

export interface SlotItem {
  slotKey: string;
  startTimeStr: string;
  endTimeStr: string;
  startsAt: string;
  endsAt: string;
  courtSlots: SlotCourtStatus[];
}

interface Props {
  initialSport: string;
  initialDate: string;
  initialTime?: string | null;
  initialCourtId?: string | null;
  courts: CourtItem[];
  slots: SlotItem[];
  discountPct: number;
  planName?: string | null;
  isJuniorUnverified: boolean;
  bookingsLeftToday: number;
  dailyLimit: number;
  maxBookingDays?: number;
}

const SPORTS = [
  { key: "TENNIS", label: "Tennis" },
  { key: "PADEL", label: "Padel" },
  { key: "BADMINTON", label: "Badminton" },
] as const;

type Period = "Morning" | "Afternoon" | "Evening";

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */
function getCourtDescriptor(court: { name: string; sport: string }) {
  const n = court.name.toLowerCase();
  if (n.includes("championship")) return "Championship Plexicushion · Floodlit";
  if (n.includes("grandstand")) return "Grandstand Red Clay · Covered";
  if (n.includes("panoramic")) return "Panoramic 12mm Glass · Mondo Turf";
  if (n.includes("pro court") || n.includes("pro")) return "Pro Tour Enclosure · LED Lighting";
  if (n.includes("teakwood")) return "Teakwood Sprung Timber · BWF Level 1";
  if (n.includes("synthetic")) return "Synthetic Mats · Shock Absorbing";
  if (court.sport.toUpperCase() === "TENNIS") return "All-weather hardcourt · Floodlit";
  if (court.sport.toUpperCase() === "PADEL") return "Tempered glass enclosure · Pro turf";
  return "BWF standard badminton court";
}

function formatInr(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function slotToPeriod(timeStr: string): Period {
  const [hStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

function format12Hour(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function getCoveredSlotKey(startTimeStr: string): string | null {
  const [hStr, mStr] = startTimeStr.split(":");
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10) + 30;
  if (m >= 60) {
    h += 1;
    m -= 60;
  }
  if (h >= 22) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getSessionEndTimeStr(startTimeStr: string): string {
  const [hStr, mStr] = startTimeStr.split(":");
  let h = parseInt(hStr, 10) + 1;
  const m = mStr || "00";
  return `${String(h).padStart(2, "0")}:${m}`;
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

function isSlotInPast(startsAt: string, selectedDate: string): boolean {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  if (selectedDate !== todayStr) return false;
  return new Date(startsAt).getTime() < now.getTime();
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                       */
/* ------------------------------------------------------------------ */
export function MemberCourtBooking({
  initialSport,
  initialDate,
  initialTime,
  initialCourtId,
  courts,
  slots: initialSlots,
  discountPct,
  planName,
  isJuniorUnverified,
  bookingsLeftToday: initialBookingsLeft,
  dailyLimit,
  maxBookingDays = 30,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [selectedSport, setSelectedSport] = useState<string>(initialSport);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string | null>(initialTime || null);
  const [selectedCourtId, setSelectedCourtId] = useState<string>("ANY"); // "ANY" or specific courtId
  const [isSocialPlay, setIsSocialPlay] = useState<boolean>(false);
  const [slots, setSlots] = useState<SlotItem[]>(initialSlots);
  const [bookingsLeft, setBookingsLeft] = useState<number>(initialBookingsLeft);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState<boolean>(false);

  // Week Strip navigation
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [showCalendarPicker, setShowCalendarPicker] = useState<boolean>(false);

  // Hold State & Countdown
  const [heldBooking, setHeldBooking] = useState<{ id: string; expiresAt: Date } | null>(null);
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState<number>(300);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD" | "CASH" | "ONLINE">("UPI");
  const [bookingSuccess, setBookingSuccess] = useState<{
    id: string;
    courtName: string;
    time: string;
    date: string;
    total: number;
  } | null>(null);

  // Errors & Transitions
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [holdErrorMessage, setHoldErrorMessage] = useState<string | null>(null);
  const [isHolding, startHoldingTransition] = useTransition();
  const [isConfirming, startConfirmingTransition] = useTransition();
  const [showMobileSummary, setShowMobileSummary] = useState<boolean>(false);

  // Filter courts by sport
  const sportCourts = useMemo(() => {
    return courts.filter((c) => c.sport.toUpperCase() === selectedSport.toUpperCase());
  }, [courts, selectedSport]);

  // Counts of courts per sport for the pills
  const sportCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of courts) {
      const s = c.sport.toUpperCase();
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [courts]);

  // Today and booking window
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayStr = useMemo(() => format(today, "yyyy-MM-dd"), [today]);

  // Compute 7 days visible in the week strip based on weekOffset
  const weekDays = useMemo(() => {
    const start = addDays(today, weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i);
      const iso = format(d, "yyyy-MM-dd");
      const isPast = isBefore(d, today);
      const isTooFar = isAfter(d, addDays(today, maxBookingDays));
      return {
        date: d,
        iso,
        dayName: format(d, "EEE"),
        dayNum: format(d, "d"),
        monthShort: format(d, "MMM"),
        year: format(d, "yyyy"),
        isAllowed: !isPast && !isTooFar,
        isToday: iso === todayStr,
      };
    });
  }, [today, weekOffset, todayStr, maxBookingDays]);

  // Month & Year header for the week strip
  const monthYearLabel = useMemo(() => {
    if (weekDays.length === 0) return "";
    const first = weekDays[0].date;
    const last = weekDays[6].date;
    if (format(first, "MMM yyyy") === format(last, "MMM yyyy")) {
      return format(first, "MMMM yyyy");
    }
    return `${format(first, "MMM")} – ${format(last, "MMM yyyy")}`;
  }, [weekDays]);

  // Sync weekOffset if selectedDate is beyond the visible week
  useEffect(() => {
    const selDate = parseISO(selectedDate);
    const diffDays = Math.floor((selDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays >= 0) {
      const neededWeek = Math.floor(diffDays / 7);
      if (neededWeek !== weekOffset) {
        setWeekOffset(neededWeek);
      }
    }
  }, [selectedDate, today, weekOffset]);

  // URL sync without full reload
  const updateUrlParams = useCallback(
    (updates: { sport?: string; date?: string; time?: string | null; court?: string | null }) => {
      const url = new URL(window.location.href);
      if (updates.sport !== undefined) url.searchParams.set("sport", updates.sport);
      if (updates.date !== undefined) url.searchParams.set("date", updates.date);
      if (updates.time !== undefined) {
        if (updates.time) url.searchParams.set("time", updates.time);
        else url.searchParams.delete("time");
      }
      if (updates.court !== undefined) {
        if (updates.court) url.searchParams.set("court", updates.court);
        else url.searchParams.delete("court");
      }
      window.history.replaceState(null, "", url.toString());
    },
    []
  );

  // Fetch availability for a specific date
  const fetchAvailability = useCallback(
    async (dateToFetch: string) => {
      try {
        setIsLoadingAvailability(true);
        const res = await fetch(`/api/courts/availability?date=${dateToFetch}`);
        if (!res.ok) throw new Error("Failed to fetch court availability");
        const data = await res.json();
        const formatted: SlotItem[] = data.rows.map((s: any) => ({
          slotKey: s.slotKey,
          startTimeStr: s.startTimeStr,
          endTimeStr: s.endTimeStr,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          courtSlots: s.courts.map((cs: any) => ({
            courtId: cs.courtId,
            status: (cs.state === "AVAILABLE" || cs.status === "FREE") ? "FREE" : cs.state === "HELD" ? "HELD" : "CONFIRMED",
            bookingId: cs.booking?.id || null,
          })),
        }));
        setSlots(formatted);
      } catch (err) {
        console.error("Availability refresh error:", err);
      } finally {
        setIsLoadingAvailability(false);
      }
    },
    []
  );

  // Revalidate every 30 seconds and on window focus
  useEffect(() => {
    const handleFocus = () => fetchAvailability(selectedDate);
    window.addEventListener("focus", handleFocus);
    const interval = setInterval(() => fetchAvailability(selectedDate), 30000);

    // Prefetch next day
    const nextDay = format(addDays(parseISO(selectedDate), 1), "yyyy-MM-dd");
    fetch(`/api/courts/availability?date=${nextDay}`).catch(() => {});

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [selectedDate, fetchAvailability]);

  // Derived: Free court IDs per slot for current sport
  const slotFreeCourtsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const row of slots) {
      if (isSlotInPast(row.startsAt, selectedDate)) {
        map[row.slotKey] = [];
        continue;
      }
      const freeForSport = row.courtSlots
        .filter((cs) => cs.status === "FREE" && sportCourts.some((sc) => sc.id === cs.courtId))
        .map((cs) => cs.courtId);
      map[row.slotKey] = freeForSport;
    }
    return map;
  }, [slots, selectedDate, sportCourts]);

  // Group slots into Morning, Afternoon, Evening
  const periods = useMemo(() => {
    const groups: Record<Period, SlotItem[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    for (const slot of slots) {
      if (isSlotInPast(slot.startsAt, selectedDate)) continue;
      groups[slotToPeriod(slot.startTimeStr)].push(slot);
    }
    return groups;
  }, [slots, selectedDate]);

  // Check if today's past periods are disabled
  const disabledPeriods = useMemo(() => {
    const disabled: Record<Period, boolean> = {
      Morning: false,
      Afternoon: false,
      Evening: false,
    };
    if (selectedDate === todayStr) {
      const now = new Date();
      // Morning ends at 12:00
      if (now.getHours() >= 12) disabled.Morning = true;
      // Afternoon ends at 17:00
      if (now.getHours() >= 17) disabled.Afternoon = true;
      // Evening ends at 22:00
      if (now.getHours() >= 22) disabled.Evening = true;
    }
    return disabled;
  }, [selectedDate, todayStr]);

  // Determine default period: the period containing the next available slot
  const defaultPeriod = useMemo<Period>(() => {
    for (const p of ["Morning", "Afternoon", "Evening"] as Period[]) {
      if (!disabledPeriods[p]) {
        const hasSlot = periods[p].some((s) => (slotFreeCourtsMap[s.slotKey] || []).length > 0);
        if (hasSlot) return p;
      }
    }
    return "Morning";
  }, [disabledPeriods, periods, slotFreeCourtsMap]);

  const [activePeriod, setActivePeriod] = useState<Period>(defaultPeriod);

  // Update active period when date changes
  useEffect(() => {
    setActivePeriod(defaultPeriod);
  }, [defaultPeriod, selectedDate]);

  // Currently selected slot row
  const selectedSlot = useMemo(() => {
    return slots.find((s) => s.slotKey === selectedTime) || null;
  }, [slots, selectedTime]);

  // Free courts for selected slot
  const availableCourtsForSlot = useMemo(() => {
    if (!selectedSlot) return [];
    const freeIds = slotFreeCourtsMap[selectedSlot.slotKey] || [];
    return sportCourts.filter((c) => freeIds.includes(c.id));
  }, [selectedSlot, slotFreeCourtsMap, sportCourts]);

  // Cheapest court price for "Any available court"
  const anyCourtBasePrice = useMemo(() => {
    if (availableCourtsForSlot.length === 0) return 1000;
    return Math.min(...availableCourtsForSlot.map((c) => c.basePrice));
  }, [availableCourtsForSlot]);

  // Active chosen court (or cheapest for "ANY")
  const resolvedCourt = useMemo(() => {
    if (availableCourtsForSlot.length === 0) return null;
    if (selectedCourtId === "ANY") {
      return availableCourtsForSlot[0];
    }
    return availableCourtsForSlot.find((c) => c.id === selectedCourtId) || availableCourtsForSlot[0];
  }, [availableCourtsForSlot, selectedCourtId]);

  // Pricing calculations
  const basePrice = resolvedCourt ? resolvedCourt.basePrice : anyCourtBasePrice;
  const discountAmount = Math.round((basePrice * discountPct) / 100);
  const netPayable = Math.max(0, basePrice - discountAmount);

  // Countdown timer for active hold
  useEffect(() => {
    if (!heldBooking) return;

    const interval = setInterval(() => {
      const nowMs = Date.now();
      const expiresMs = new Date(heldBooking.expiresAt).getTime();
      const diffSec = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
      setHoldSecondsRemaining(diffSec);

      if (diffSec <= 0) {
        clearInterval(interval);
        releaseMemberHoldAction(heldBooking.id);
        setHeldBooking(null);
        setHoldErrorMessage("Hold expired. Choose a time again.");
        fetchAvailability(selectedDate);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [heldBooking, selectedDate, fetchAvailability]);

  // Keyboard navigation for time grid
  const gridButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleGridKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    slotList: SlotItem[]
  ) => {
    const total = slotList.length;
    let nextIndex = -1;

    switch (e.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % total;
        break;
      case "ArrowLeft":
        nextIndex = (index - 1 + total) % total;
        break;
      case "ArrowDown":
        // Jump down row (approx 6 cols)
        nextIndex = Math.min(total - 1, index + 6);
        break;
      case "ArrowUp":
        // Jump up row
        nextIndex = Math.max(0, index - 6);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if ((slotFreeCourtsMap[slotList[index].slotKey] || []).length > 0) {
          handleSelectTime(slotList[index].slotKey);
        }
        return;
    }

    if (nextIndex >= 0 && gridButtonsRef.current[nextIndex]) {
      e.preventDefault();
      gridButtonsRef.current[nextIndex]?.focus();
    }
  };

  // Actions
  const handleSelectSport = (sportKey: string) => {
    setSelectedSport(sportKey);
    setSelectedTime(null);
    setSelectedCourtId("ANY");
    setErrorMessage(null);
    setHoldErrorMessage(null);
    updateUrlParams({ sport: sportKey, time: null, court: null });
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSelectedTime(null);
    setSelectedCourtId("ANY");
    setErrorMessage(null);
    setHoldErrorMessage(null);
    setShowCalendarPicker(false);
    updateUrlParams({ date: dateStr, time: null, court: null });
    fetchAvailability(dateStr);
  };

  const handleSelectTime = (slotKey: string) => {
    const freeCount = (slotFreeCourtsMap[slotKey] || []).length;
    if (freeCount === 0 || bookingsLeft <= 0) return;

    setSelectedTime(slotKey);
    setSelectedCourtId("ANY");
    setErrorMessage(null);
    setHoldErrorMessage(null);
    updateUrlParams({ time: slotKey, court: "ANY" });
  };

  const handleSelectCourt = (courtId: string) => {
    setSelectedCourtId(courtId);
    setErrorMessage(null);
    setHoldErrorMessage(null);
    updateUrlParams({ court: courtId });
  };

  // Step 1: Create Hold
  const handleInitiateHold = () => {
    if (!selectedSlot || !resolvedCourt) return;
    if (bookingsLeft <= 0) {
      setErrorMessage("Daily booking limit reached. Try another date.");
      return;
    }

    setErrorMessage(null);
    setHoldErrorMessage(null);

    startHoldingTransition(async () => {
      const res = await createMemberHoldAction({
        courtId: resolvedCourt.id,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        kind: isSocialPlay ? "SOCIAL" : "NORMAL",
      });

      if (!res.success || !("booking" in res) || !res.booking) {
        setErrorMessage("That slot was just taken. Pick another time.");
        fetchAvailability(selectedDate);
        return;
      }

      setHeldBooking({
        id: res.booking.id,
        expiresAt: res.booking.holdExpiresAt
          ? new Date(res.booking.holdExpiresAt)
          : new Date(Date.now() + 300000),
      });
      setHoldSecondsRemaining(300);
      setShowMobileSummary(true);
    });
  };

  // Step 2: Confirm Held Booking
  const handleConfirmHeldBooking = () => {
    if (!heldBooking || !selectedSlot || !resolvedCourt) return;

    setErrorMessage(null);

    startConfirmingTransition(async () => {
      const res = await confirmMemberBookingAction({
        bookingId: heldBooking.id,
        paymentMethod,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Payment did not go through. Please try again.");
        return;
      }

      setBookingSuccess({
        id: heldBooking.id,
        courtName: resolvedCourt.name,
        time: `${format12Hour(selectedSlot.startTimeStr)} – ${format12Hour(selectedSlot.endTimeStr)}`,
        date: format(parseISO(selectedDate), "EEE, dd MMM yyyy"),
        total: netPayable,
      });
      setHeldBooking(null);
      setBookingsLeft((prev) => Math.max(0, prev - 1));
      fetchAvailability(selectedDate);
    });
  };

  // Format MM:SS for countdown
  const formattedCountdown = useMemo(() => {
    const mins = Math.floor(holdSecondsRemaining / 60);
    const secs = holdSecondsRemaining % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [holdSecondsRemaining]);

  /* ================================================================ */
  /*  SUCCESS VIEW                                                    */
  /* ================================================================ */
  if (bookingSuccess) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#1F4A33] text-white flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>
        <div className="space-y-2">
          <h2 className="font-anton text-3xl uppercase tracking-normal text-[#111111]">
            Court Reserved
          </h2>
          <p className="text-sm text-[#6B6B6B]">
            Your court booking is confirmed. Details have been logged to your account.
          </p>
        </div>

        <div className="bg-[#EFEFEF] rounded-[16px] p-6 text-left space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">Court</span>
            <span className="font-semibold text-[#111111]">{bookingSuccess.courtName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">Date</span>
            <span className="font-semibold text-[#111111]">{bookingSuccess.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6B6B6B]">Time</span>
            <span className="font-semibold text-[#111111]">{bookingSuccess.time}</span>
          </div>
          <div className="flex justify-between border-t border-[#E6E6E6] pt-2 text-sm font-bold text-[#111111]">
            <span>Amount Paid</span>
            <span>{formatInr(bookingSuccess.total)}</span>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href="/member/bookings"
            prefetch={false}
            className="h-11 px-6 rounded-full bg-[#1F4A33] text-white font-semibold text-xs flex items-center justify-center hover:bg-[#183a28] transition-colors"
          >
            View My Bookings
          </Link>
          <button
            onClick={() => {
              setBookingSuccess(null);
              setSelectedTime(null);
              setSelectedCourtId("ANY");
            }}
            className="h-11 px-6 rounded-full border border-[#111111] text-[#111111] font-semibold text-xs hover:bg-[#EFEFEF] transition-colors cursor-pointer"
          >
            Book Another Court
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  MAIN BOOKING VIEW                                               */
  /* ================================================================ */
  return (
    <div className="space-y-6 pb-28 lg:pb-0">
      {/* Page Title */}
      <h1 className="font-anton text-4xl sm:text-5xl uppercase tracking-normal text-[#111111] leading-none">
        Book a Court
      </h1>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-[14px] bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {holdErrorMessage && (
        <div className="p-4 rounded-[14px] bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium">
          {holdErrorMessage}
        </div>
      )}

      {/* 2-Column Split: Left = Selections, Right = Sticky Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ==================== LEFT COLUMN ==================== */}
        <div className="lg:col-span-8 space-y-8">
          {/* 1. SPORT */}
          <section className="space-y-2">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-[#6B6B6B] uppercase block">
              Sport
            </span>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => {
                const isSelected = selectedSport.toUpperCase() === s.key;
                const count = sportCounts[s.key] || 0;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => handleSelectSport(s.key)}
                    className={`h-11 px-5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#111111] text-white shadow-xs"
                        : "bg-[#EFEFEF] text-[#111111] hover:bg-[#E5E5E5] border border-transparent"
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className={`text-[11px] ${isSelected ? "text-white/70" : "text-[#6B6B6B]"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. DATE */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-[#6B6B6B] uppercase block">
                Date
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#111111]">{monthYearLabel}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={weekOffset === 0}
                    onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                    aria-label="Previous week"
                    className="w-7 h-7 rounded-full border border-[#E6E6E6] flex items-center justify-center text-xs text-[#111111] hover:bg-[#EFEFEF] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled={(weekOffset + 1) * 7 >= maxBookingDays}
                    onClick={() => setWeekOffset((prev) => prev + 1)}
                    aria-label="Next week"
                    className="w-7 h-7 rounded-full border border-[#E6E6E6] flex items-center justify-center text-xs text-[#111111] hover:bg-[#EFEFEF] disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                  >
                    ›
                  </button>
                </div>
                {/* Calendar Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCalendarPicker(!showCalendarPicker)}
                    className="text-xs font-semibold text-[#1F4A33] hover:underline cursor-pointer ml-1"
                  >
                    Calendar
                  </button>

                  {/* Calendar Popover */}
                  {showCalendarPicker && (
                    <div className="absolute right-0 top-8 z-50 bg-white border border-[#E6E6E6] rounded-[16px] p-4 shadow-xl w-72 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-[#111111] pb-2 border-b border-[#E6E6E6]">
                        <span>Select Booking Date</span>
                        <button
                          type="button"
                          onClick={() => setShowCalendarPicker(false)}
                          className="text-[#6B6B6B] hover:text-[#111111]"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
                        {Array.from({ length: maxBookingDays }, (_, i) => {
                          const d = addDays(today, i);
                          const iso = format(d, "yyyy-MM-dd");
                          const isSel = iso === selectedDate;
                          return (
                            <button
                              key={iso}
                              type="button"
                              onClick={() => handleSelectDate(iso)}
                              className={`p-2 rounded-[10px] text-center text-xs transition-colors cursor-pointer ${
                                isSel
                                  ? "bg-[#111111] text-white font-bold"
                                  : "hover:bg-[#EFEFEF] text-[#111111]"
                              }`}
                            >
                              <div className="text-[10px] text-[#6B6B6B]">{format(d, "EEE")}</div>
                              <div className="font-semibold">{format(d, "d MMM")}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 7-Day Week Strip */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const isSelected = day.iso === selectedDate;
                const isDayAllowed = day.isAllowed;

                return (
                  <button
                    key={day.iso}
                    type="button"
                    disabled={!isDayAllowed}
                    onClick={() => handleSelectDate(day.iso)}
                    className={`h-[64px] min-h-[44px] rounded-[14px] flex flex-col items-center justify-center transition-all cursor-pointer relative select-none ${
                      isSelected
                        ? "bg-[#111111] text-white shadow-xs"
                        : isDayAllowed
                        ? "bg-white border border-[#E6E6E6] text-[#111111] hover:border-[#111111]"
                        : "bg-neutral-50 border border-[#E6E6E6] text-[#9CA3AF] opacity-35 cursor-not-allowed line-through"
                    }`}
                  >
                    <span
                      className={`text-[10px] uppercase font-semibold ${
                        isSelected ? "text-white/80" : "text-[#6B6B6B]"
                      }`}
                    >
                      {day.dayName}
                    </span>
                    <span className="text-base font-bold leading-tight mt-0.5">{day.dayNum}</span>
                    {day.isToday && !isSelected && (
                      <span className="absolute bottom-1.5 w-4 h-0.5 bg-[#111111] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 3. TIME */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-[#6B6B6B] uppercase block">
                Time
              </span>

              {/* Segmented Period Filter */}
              <div className="flex bg-[#EFEFEF] p-1 rounded-full w-fit">
                {(["Morning", "Afternoon", "Evening"] as Period[]).map((period) => {
                  const isActive = activePeriod === period;
                  const isDisabled = disabledPeriods[period];
                  return (
                    <button
                      key={period}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setActivePeriod(period)}
                      className={`h-7 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-white text-[#111111] shadow-xs"
                          : isDisabled
                          ? "text-[#A3A3A3] cursor-not-allowed opacity-50"
                          : "text-[#6B6B6B] hover:text-[#111111]"
                      }`}
                    >
                      {period}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Grid: 3 cols desktop, 2 on mobile, 44px tall */}
            {periods[activePeriod].length === 0 ? (
              <div className="p-8 text-center bg-[#EFEFEF] rounded-[14px] text-xs text-[#6B6B6B]">
                No available time slots in the {activePeriod.toLowerCase()} on this date.
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {periods[activePeriod].map((slot, index) => {
                  const freeCourts = slotFreeCourtsMap[slot.slotKey] || [];
                  const isAvailable = freeCourts.length > 0 && bookingsLeft > 0;
                  const isSelected = slot.slotKey === selectedTime;
                  const isLastCourt = freeCourts.length === 1;
                  const rangeStr = formatSessionRange(slot.startTimeStr, slot.endTimeStr);

                  return (
                    <button
                      key={slot.slotKey}
                      ref={(el) => {
                        gridButtonsRef.current[index] = el;
                      }}
                      type="button"
                      disabled={!isAvailable}
                      aria-pressed={isSelected}
                      aria-label={`Session: ${rangeStr}, ${isAvailable ? "available" : "unavailable"}`}
                      onClick={() => handleSelectTime(slot.slotKey)}
                      onKeyDown={(e) => handleGridKeyDown(e, index, periods[activePeriod])}
                      className={`h-[44px] min-h-[44px] rounded-[14px] text-xs transition-all relative flex items-center justify-center px-3 focus-visible:ring-2 focus-visible:ring-[#1F4A33] focus-visible:ring-offset-2 outline-none select-none cursor-pointer ${
                        isSelected
                          ? "bg-[#1F4A33] border border-[#1F4A33] text-white font-bold shadow-xs"
                          : isAvailable
                          ? "bg-white border border-[#E6E6E6] text-[#111111] hover:border-[#1F4A33] font-medium"
                          : "bg-neutral-50 border border-[#E6E6E6] text-[#9CA3AF] line-through cursor-not-allowed opacity-60"
                      }`}
                    >
                      <span className="truncate">{rangeStr}</span>

                      {/* Small amber dot for "Last court" */}
                      {isAvailable && isLastCourt && !isSelected && (
                        <span
                          className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500"
                          title="Last court"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-[#6B6B6B]">Each session is 60 minutes.</p>
          </section>

          {/* 4. COURT (Appears after time is selected) */}
          {selectedTime && selectedSlot && (
            <section className="space-y-3 pt-2">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-[#6B6B6B] uppercase block">
                Court
              </span>

              {availableCourtsForSlot.length === 0 ? (
                <div className="p-4 rounded-[14px] bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  All courts are booked at this time. Please pick another time slot.
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Default Row: Any available court */}
                  <label
                    onClick={() => handleSelectCourt("ANY")}
                    className={`flex items-center justify-between p-4 rounded-[14px] border transition-all cursor-pointer ${
                      selectedCourtId === "ANY"
                        ? "bg-[#1F4A33]/5 border-[#1F4A33] ring-1 ring-[#1F4A33]"
                        : "bg-white border-[#E6E6E6] hover:border-[#111111]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedCourtId === "ANY"
                            ? "border-[#1F4A33] bg-[#1F4A33]"
                            : "border-[#6B6B6B]"
                        }`}
                      >
                        {selectedCourtId === "ANY" && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#111111]">Any available court</div>
                        <div className="text-[11px] text-[#6B6B6B]">
                          System assigns the best available court at booking
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-[#111111]">
                        {formatInr(Math.round(anyCourtBasePrice * (1 - discountPct / 100)))}
                      </div>
                      {discountPct > 0 && (
                        <div className="text-[10px] text-[#6B6B6B] line-through">
                          {formatInr(anyCourtBasePrice)}
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Specific Courts */}
                  {availableCourtsForSlot.map((court) => {
                    const isChosen = selectedCourtId === court.id;
                    const courtMemberPrice = Math.round(court.basePrice * (1 - discountPct / 100));
                    const descriptor = court.descriptor || getCourtDescriptor(court);

                    return (
                      <label
                        key={court.id}
                        onClick={() => handleSelectCourt(court.id)}
                        className={`flex items-center justify-between p-4 rounded-[14px] border transition-all cursor-pointer ${
                          isChosen
                            ? "bg-[#1F4A33]/5 border-[#1F4A33] ring-1 ring-[#1F4A33]"
                            : "bg-white border-[#E6E6E6] hover:border-[#111111]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isChosen ? "border-[#1F4A33] bg-[#1F4A33]" : "border-[#6B6B6B]"
                            }`}
                          >
                            {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#111111]">{court.name}</div>
                            <div className="text-[11px] text-[#6B6B6B]">{descriptor}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-bold text-[#111111]">
                            {formatInr(courtMemberPrice)}
                          </div>
                          {discountPct > 0 && (
                            <div className="text-[10px] text-[#6B6B6B] line-through">
                              {formatInr(court.basePrice)}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* 5. SOCIAL PLAY */}
              <div className="mt-4 pt-4 border-t border-[#E6E6E6]">
                <label className="flex items-center justify-between p-3 rounded-[14px] bg-[#EFEFEF] hover:bg-[#E5E5E5] transition-colors cursor-pointer select-none">
                  <div>
                    <span className="text-xs font-semibold text-[#111111] block">
                      Social play, add friends
                    </span>
                    <span className="text-[11px] text-[#6B6B6B] block">
                      Allows other verified club members to join your court session.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSocialPlay}
                    onChange={(e) => setIsSocialPlay(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1F4A33] focus:ring-[#1F4A33] border-[#E6E6E6] cursor-pointer"
                  />
                </label>
              </div>
            </section>
          )}
        </div>

        {/* ==================== RIGHT COLUMN: STICKY SUMMARY CARD (DESKTOP) ==================== */}
        <aside className="hidden lg:block lg:col-span-4 sticky top-[88px]">
          <SummaryCardContent
            selectedSport={selectedSport}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            resolvedCourt={resolvedCourt}
            selectedCourtId={selectedCourtId}
            basePrice={basePrice}
            discountPct={discountPct}
            discountAmount={discountAmount}
            netPayable={netPayable}
            bookingsLeft={bookingsLeft}
            dailyLimit={dailyLimit}
            planName={planName}
            isJuniorUnverified={isJuniorUnverified}
            heldBooking={heldBooking}
            formattedCountdown={formattedCountdown}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            isHolding={isHolding}
            isConfirming={isConfirming}
            onInitiateHold={handleInitiateHold}
            onConfirmHeldBooking={handleConfirmHeldBooking}
          />
        </aside>
      </div>

      {/* ==================== MOBILE FIXED BOTTOM BAR & SHEET ==================== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E6E6E6] px-4 py-3 flex items-center justify-between shadow-lg">
        <div>
          <div className="text-[10px] text-[#6B6B6B] uppercase font-semibold">Total Payable</div>
          <div className="text-lg font-bold text-[#111111] leading-none">
            {selectedSlot ? formatInr(netPayable) : "—"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMobileSummary(true)}
          className="h-10 px-6 rounded-full bg-[#1F4A33] text-white text-xs font-bold hover:bg-[#183a28] transition-colors cursor-pointer"
        >
          {heldBooking ? "Complete Payment" : "Continue"}
        </button>
      </div>

      {/* Mobile Bottom Sheet Modal */}
      {showMobileSummary && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end">
          <div className="bg-white rounded-t-[20px] w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-[#E6E6E6]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
                Booking Summary
              </span>
              <button
                type="button"
                onClick={() => setShowMobileSummary(false)}
                className="w-7 h-7 rounded-full bg-[#EFEFEF] flex items-center justify-center text-xs font-bold text-[#111111]"
              >
                ✕
              </button>
            </div>

            <SummaryCardContent
              selectedSport={selectedSport}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              resolvedCourt={resolvedCourt}
              selectedCourtId={selectedCourtId}
              basePrice={basePrice}
              discountPct={discountPct}
              discountAmount={discountAmount}
              netPayable={netPayable}
              bookingsLeft={bookingsLeft}
              dailyLimit={dailyLimit}
              planName={planName}
              isJuniorUnverified={isJuniorUnverified}
              heldBooking={heldBooking}
              formattedCountdown={formattedCountdown}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              isHolding={isHolding}
              isConfirming={isConfirming}
              onInitiateHold={handleInitiateHold}
              onConfirmHeldBooking={handleConfirmHeldBooking}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Summary Card Content (Shared between Desktop & Mobile Sheet)       */
/* ------------------------------------------------------------------ */
function SummaryCardContent({
  selectedSport,
  selectedDate,
  selectedSlot,
  resolvedCourt,
  selectedCourtId,
  basePrice,
  discountPct,
  discountAmount,
  netPayable,
  bookingsLeft,
  dailyLimit,
  planName,
  isJuniorUnverified,
  heldBooking,
  formattedCountdown,
  paymentMethod,
  setPaymentMethod,
  isHolding,
  isConfirming,
  onInitiateHold,
  onConfirmHeldBooking,
}: {
  selectedSport: string;
  selectedDate: string;
  selectedSlot: SlotItem | null;
  resolvedCourt: CourtItem | null;
  selectedCourtId: string;
  basePrice: number;
  discountPct: number;
  discountAmount: number;
  netPayable: number;
  bookingsLeft: number;
  dailyLimit: number;
  planName?: string | null;
  isJuniorUnverified: boolean;
  heldBooking: { id: string; expiresAt: Date } | null;
  formattedCountdown: string;
  paymentMethod: "UPI" | "CARD" | "CASH" | "ONLINE";
  setPaymentMethod: (m: "UPI" | "CARD" | "CASH" | "ONLINE") => void;
  isHolding: boolean;
  isConfirming: boolean;
  onInitiateHold: () => void;
  onConfirmHeldBooking: () => void;
}) {
  const isLimitReached = bookingsLeft <= 0;
  const canHold = selectedSlot && (selectedCourtId === "ANY" || resolvedCourt) && !isLimitReached;

  return (
    <div className="bg-[#EFEFEF] rounded-[16px] p-6 space-y-5">
      {/* Active Hold Countdown Banner */}
      {heldBooking && (
        <div className="p-3.5 rounded-[12px] bg-[#1F4A33] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Slot held for you</span>
          </div>
          <span className="text-sm font-mono font-bold">{formattedCountdown}</span>
        </div>
      )}

      {/* Row Summary */}
      <div className="space-y-2.5 text-xs">
        <div className="flex justify-between">
          <span className="text-[#6B6B6B]">Sport</span>
          <span className="font-semibold text-[#111111]">{selectedSport || "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B6B6B]">Date</span>
          <span className="font-semibold text-[#111111]">
            {selectedDate ? format(parseISO(selectedDate), "EEE, dd MMM yyyy") : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B6B6B]">Time</span>
          <span className="font-semibold text-[#111111]">
            {selectedSlot
              ? formatSessionRange(selectedSlot.startTimeStr, selectedSlot.endTimeStr)
              : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B6B6B]">Court</span>
          <span className="font-semibold text-[#111111] truncate max-w-[180px]">
            {selectedCourtId === "ANY"
              ? "Any available court"
              : resolvedCourt
              ? resolvedCourt.name
              : "—"}
          </span>
        </div>
      </div>

      {/* Price Block */}
      <div className="border-t border-[#E6E6E6] pt-4 space-y-2 text-xs">
        <div className="flex justify-between text-[#6B6B6B]">
          <span>Court price</span>
          <span>{selectedSlot ? formatInr(basePrice) : "—"}</span>
        </div>

        {discountPct > 0 && selectedSlot && (
          <div className="flex justify-between text-[#1F4A33] font-semibold">
            <span>
              {planName || "Member"} discount ({discountPct}%)
            </span>
            <span>-{formatInr(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between items-baseline pt-2 border-t border-[#E6E6E6]">
          <span className="text-xs font-bold text-[#111111]">Total</span>
          <span className="text-[28px] font-semibold text-[#111111] leading-none">
            {selectedSlot ? formatInr(netPayable) : "—"}
          </span>
        </div>
      </div>

      {/* Daily Limit Line */}
      <div className="text-[11px] text-[#6B6B6B]">
        {isLimitReached ? (
          <span className="text-amber-800 font-semibold">
            Daily limit reached. Try another date.
          </span>
        ) : (
          <span>
            {bookingsLeft} of {dailyLimit} sessions left today
          </span>
        )}
      </div>

      {/* Junior Unverified Plain Line */}
      {isJuniorUnverified && (
        <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
          Junior discount applies after age verification at the front desk.
        </p>
      )}

      {/* Hold / Confirm Action */}
      {!heldBooking ? (
        <button
          type="button"
          disabled={!canHold || isHolding}
          onClick={onInitiateHold}
          className="w-full h-12 rounded-full bg-[#1F4A33] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center hover:bg-[#183a28] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {isHolding ? "Holding Slot..." : "Confirm booking"}
        </button>
      ) : (
        <div className="space-y-3 pt-2">
          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B] block">
              Payment Method
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(["UPI", "CARD", "CASH"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`h-8 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer ${
                    paymentMethod === method
                      ? "bg-[#111111] text-white"
                      : "bg-white border border-[#E6E6E6] text-[#111111] hover:bg-neutral-100"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={isConfirming}
            onClick={onConfirmHeldBooking}
            className="w-full h-12 rounded-full bg-[#1F4A33] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center hover:bg-[#183a28] disabled:opacity-50 transition-all cursor-pointer"
          >
            {isConfirming ? "Confirming..." : "Complete & Confirm"}
          </button>
        </div>
      )}
    </div>
  );
}
