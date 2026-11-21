"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";

interface DaySlot {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // "Today", "Sun", "Mon", etc.
  formattedDate: string; // "Nov 22"
  freeSlotsCount: number;
  featuredSlots: Array<{
    courtName: string;
    sport: string;
    time: string;
  }>;
}

export function WeekAvailabilityStrip({ days }: { days: DaySlot[] }) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const activeDay = days[selectedDayIndex] || days[0];

  return (
    <div className="space-y-6">
      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {days.map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          return (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex flex-col items-center min-w-[90px] px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#C8F13A] text-[#07271D] font-bold shadow-lg scale-105"
                  : "bg-[#0E4433] hover:bg-white/10 text-[#F4F1EA] border border-white/10"
              }`}
            >
              <span className="text-[11px] uppercase tracking-wider opacity-80">
                {day.dayLabel}
              </span>
              <span className="text-base font-extrabold">{day.formattedDate}</span>
              <span
                className={`text-[10px] mt-1 font-bold ${
                  isSelected ? "text-[#07271D]/80" : "text-[#C8F13A]"
                }`}
              >
                {day.freeSlotsCount} open
              </span>
            </button>
          );
        })}
      </div>

      {/* Featured Free Slots For Selected Day */}
      <div className="rounded-3xl p-6 bg-[#0E4433] border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#C8F13A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#F4F1EA]">
              Available Slots for {activeDay?.dayLabel} ({activeDay?.formattedDate})
            </span>
          </div>
          <Link
            href={`/member/book?date=${activeDay?.dateStr}`}
            className="text-xs font-bold text-[#C8F13A] hover:underline flex items-center gap-1"
          >
            <span>View Full Grid</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {activeDay?.featuredSlots && activeDay.featuredSlots.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {activeDay.featuredSlots.map((slot, i) => (
              <Link
                key={i}
                href={`/member/book?date=${activeDay.dateStr}`}
                className="p-3 rounded-2xl bg-[#07271D] hover:bg-[#C8F13A] text-[#F4F1EA] hover:text-[#07271D] border border-white/10 hover:border-[#C8F13A] transition-all group flex flex-col justify-between"
              >
                <div className="text-[10px] uppercase font-bold text-[#C8F13A] group-hover:text-[#07271D]">
                  {slot.sport}
                </div>
                <div className="text-sm font-extrabold font-mono my-1">{slot.time}</div>
                <div className="text-[10px] text-[#F4F1EA]/60 group-hover:text-[#07271D]/80 truncate">
                  {slot.courtName.split(" (")[0]}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-[#F4F1EA]/50">
            No open prime slots remaining on this day. Check the full schedule for late sessions.
          </div>
        )}
      </div>
    </div>
  );
}
