"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";

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
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {days.map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex flex-col items-center min-w-[96px] px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#1B1B1B] text-[#F6F5E1] shadow-md scale-105"
                  : "bg-white hover:bg-[#EDECCF] text-[#1B1B1B] border border-[#1B1B1B]/20"
              }`}
            >
              <span className="text-[11px] uppercase tracking-wider opacity-75">
                {day.dayLabel}
              </span>
              <span className="text-base font-bold">{day.formattedDate}</span>
              <span
                className={`text-[10px] mt-1 font-bold ${
                  isSelected ? "text-[#E8883A]" : "text-[#5F9E4A]"
                }`}
              >
                {day.freeSlotsCount} open
              </span>
            </button>
          );
        })}
      </div>

      {/* Featured Free Slots For Selected Day */}
      <div className="rounded-[28px] p-6 bg-white border border-[#1B1B1B]/20 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#5F9E4A]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#1B1B1B]">
              Available Slots for {activeDay?.dayLabel} ({activeDay?.formattedDate})
            </span>
          </div>
          <Link
            href={`/member/book?date=${activeDay?.dateStr}`}
            className="text-xs font-bold text-[#5F9E4A] hover:text-[#3F7A37] hover:underline flex items-center gap-1"
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
                className="p-3.5 rounded-2xl bg-[#F6F5E1] hover:bg-[#1B1B1B] text-[#1B1B1B] hover:text-[#F6F5E1] border border-[#1B1B1B]/15 hover:border-[#1B1B1B] transition-all group flex flex-col justify-between shadow-2xs"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#E8883A] group-hover:text-[#E8883A]">
                    {slot.sport}
                  </span>
                  <div className="text-xs font-bold truncate mt-0.5">
                    {slot.courtName}
                  </div>
                </div>
                <div className="mt-3 text-sm font-extrabold flex items-center justify-between">
                  <span>{slot.time}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#5F9E4A]/15 text-[#3F7A37] group-hover:bg-[#5F9E4A] group-hover:text-white font-medium">
                    Open
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-gray-500">
            No remaining open slots for this date. Check tomorrow or select another day.
          </div>
        )}
      </div>
    </div>
  );
}
