"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfDay,
  addDays,
} from "date-fns";

interface ActiveCourtItem {
  id: string;
  name: string;
  sport: string;
  capacity: number;
  basePrice: number;
}

interface BookingBannerCardProps {
  courts: ActiveCourtItem[];
  isLoggedIn: boolean;
}

export function BookingBannerCard({ courts, isLoggedIn }: BookingBannerCardProps) {
  const router = useRouter();

  const today = useMemo(() => startOfDay(new Date()), []);
  const maxBookingDate = useMemo(() => addDays(today, 14), [today]); // 14 days advance window

  const [currentMonth, setCurrentMonth] = useState<Date>(today);
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  // Sports list from available courts
  const sports = useMemo(() => {
    const s = Array.from(new Set(courts.map((c) => c.sport))).sort();
    return s.length > 0 ? s : ["TENNIS", "PADEL", "BADMINTON"];
  }, [courts]);

  const [selectedSport, setSelectedSport] = useState<string>(sports[0] || "TENNIS");
  const [selectedCourtId, setSelectedCourtId] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Courts filtered by selected sport
  const filteredCourts = useMemo(() => {
    return courts.filter((c) => c.sport.toUpperCase() === selectedSport.toUpperCase());
  }, [courts, selectedSport]);

  // Calendar dates generation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handleBookNow = () => {
    if (!selectedDate) {
      setValidationError("Please select a date.");
      return;
    }
    if (!selectedSport) {
      setValidationError("Please select a sport.");
      return;
    }

    setValidationError(null);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const sportParam = encodeURIComponent(selectedSport);
    const courtParam = selectedCourtId ? `&court=${encodeURIComponent(selectedCourtId)}` : "";
    const bookingPath = `/member/book?date=${dateStr}&sport=${sportParam}${courtParam}`;

    if (isLoggedIn) {
      router.push(bookingPath);
    } else {
      router.push(`/login?next=${encodeURIComponent(bookingPath)}`);
    }
  };

  return (
    <div className="w-full max-w-[360px] bg-[#EFEFEF] rounded-[16px] p-5 shadow-2xl text-[#111111]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#111111]">
          Court Booking
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
            aria-label="Previous month"
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-neutral-200 text-[#111111] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-[#111111] min-w-[76px] text-center">
            {format(currentMonth, "MMM yyyy")}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            aria-label="Next month"
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-neutral-200 text-[#111111] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Day Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDayLabels.map((day) => (
          <span key={day} className="text-[10px] font-medium text-[#6B6B6B]">
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center mb-4">
        {calendarDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentToday = isSameDay(day, today);
          const isPast = isBefore(day, today);
          const isTooFar = isBefore(maxBookingDate, day);
          const isDisabled = isPast || isTooFar;
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                setSelectedDate(day);
                setValidationError(null);
              }}
              className={`w-7 h-7 mx-auto rounded-full text-xs flex items-center justify-center transition-colors ${
                !isCurrentMonth ? "opacity-25" : ""
              } ${
                isSelected || (isCurrentToday && !selectedDate)
                  ? "bg-[#111111] text-white font-bold"
                  : isDisabled
                  ? "text-neutral-400 cursor-not-allowed"
                  : "text-[#111111] hover:bg-neutral-200 font-medium cursor-pointer"
              }`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Sport Select */}
      <div className="space-y-1 mb-3">
        <label htmlFor="banner-sport-select" className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] block">
          Sport
        </label>
        <select
          id="banner-sport-select"
          value={selectedSport}
          onChange={(e) => {
            setSelectedSport(e.target.value);
            setSelectedCourtId("");
            setValidationError(null);
          }}
          className="w-full h-10 px-3 rounded-[10px] bg-white border border-[#E6E6E6] text-xs font-medium text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] transition-all"
        >
          {sports.map((sport) => {
            const formatted = sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
            return (
              <option key={sport} value={sport}>
                {formatted}
              </option>
            );
          })}
        </select>
      </div>

      {/* Court Select (filtered by sport) */}
      <div className="space-y-1 mb-4">
        <label htmlFor="banner-court-select" className="text-[11px] font-semibold uppercase tracking-wider text-[#6B6B6B] block">
          Court
        </label>
        <select
          id="banner-court-select"
          value={selectedCourtId}
          onChange={(e) => {
            setSelectedCourtId(e.target.value);
            setValidationError(null);
          }}
          className="w-full h-10 px-3 rounded-[10px] bg-white border border-[#E6E6E6] text-xs font-medium text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] transition-all"
        >
          <option value="">Any available court</option>
          {filteredCourts.map((court) => (
            <option key={court.id} value={court.id}>
              {court.name} (Cap {court.capacity})
            </option>
          ))}
        </select>
      </div>

      {validationError && (
        <p className="text-xs text-red-600 font-medium mb-3">{validationError}</p>
      )}

      {/* Book Now Button */}
      <button
        type="button"
        onClick={handleBookNow}
        className="w-full h-11 bg-[#111111] hover:bg-black text-white rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
      >
        Book now
      </button>
    </div>
  );
}
