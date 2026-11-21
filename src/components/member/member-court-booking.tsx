"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookMemberCourtAction } from "@/app/actions/bookings";
import { Calendar, Clock, Trophy, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface CourtCol {
  id: string;
  name: string;
  sport: string;
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

export function MemberCourtBooking({
  initialDate,
  courts,
  slots,
  discountPct,
}: {
  initialDate: string;
  courts: CourtCol[];
  slots: SlotRow[];
  discountPct: number;
}) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedSlot, setSelectedSlot] = useState<{
    court: CourtCol;
    startsAt: string;
    endsAt: string;
    timeLabel: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedSlot(null);
    router.push(`/member/book?date=${newDate}`);
  };

  const handleConfirmBooking = () => {
    if (!selectedSlot) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("courtId", selectedSlot.court.id);
      formData.set("startsAt", selectedSlot.startsAt);
      formData.set("endsAt", selectedSlot.endsAt);
      formData.set("paymentMethod", "ONLINE");

      const res = await bookMemberCourtAction(formData);

      if (!res.success) {
        setError(res.error || "Failed to book this slot.");
        return;
      }

      setSuccess(`Court booked successfully! ${selectedSlot.court.name} at ${selectedSlot.timeLabel}`);
      setSelectedSlot(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {/* Date Picker Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0E4433] border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-[#C8F13A]" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#F4F1EA]">
              Select Playing Date
            </div>
            <div className="text-[11px] text-[#F4F1EA]/60">
              Session availability updates in real time
            </div>
          </div>
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="h-10 px-4 rounded-full bg-[#07271D] border border-white/15 text-xs font-bold text-[#F4F1EA] focus:outline-none focus:border-[#C8F13A]"
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Booking Modal / Drawer if a slot is selected */}
      {selectedSlot && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0E4433] to-[#155541] border border-[#C8F13A]/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#C8F13A] text-[#07271D] text-[10px] font-black uppercase tracking-wider">
              Selected Session
            </div>
            <h3 className="text-2xl font-display uppercase tracking-wider text-[#F4F1EA]">
              {selectedSlot.court.name} • {selectedSlot.timeLabel}
            </h3>
            <div className="flex items-center gap-4 text-xs text-[#F4F1EA]/80 pt-1">
              <span>Standard: ₹{selectedSlot.court.basePrice}</span>
              {discountPct > 0 ? (
                <span className="text-[#C8F13A] font-bold">
                  Member Price: ₹{Math.round(selectedSlot.court.basePrice * (1 - discountPct / 100))} ({discountPct}% OFF)
                </span>
              ) : (
                <span>Walk-in Rate (0% discount)</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setSelectedSlot(null)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-full text-xs font-bold text-[#F4F1EA]/70 hover:text-white border border-white/20 hover:border-white/40 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBooking}
              disabled={isPending}
              className="flex-1 sm:flex-none px-7 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase bg-[#C8F13A] text-[#07271D] hover:bg-[#d6fa55] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm & Reserve Slot"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Availability Grid */}
      <div className="rounded-3xl bg-[#0E4433] border border-white/10 p-6 overflow-x-auto shadow-xl">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#F4F1EA]/60 w-28">
                Time
              </th>
              {courts.map((c) => (
                <th key={c.id} className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider text-[#F4F1EA]">
                  <div>{c.name}</div>
                  <div className="text-[10px] text-[#C8F13A] font-normal lowercase">{c.sport}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs">
            {slots.map((row) => (
              <tr key={row.slotKey} className="hover:bg-white/[0.02]">
                <td className="py-2.5 px-4 font-mono text-[#F4F1EA]/70 font-bold whitespace-nowrap">
                  {row.startTimeStr} - {row.endTimeStr}
                </td>
                {courts.map((court) => {
                  const cell = row.courtSlots.find((s) => s.courtId === court.id);
                  const isFree = cell?.status === "FREE";
                  const isSelected =
                    selectedSlot?.court.id === court.id &&
                    selectedSlot?.startsAt === row.startsAt;

                  return (
                    <td key={court.id} className="py-2 px-2 text-center">
                      {isFree ? (
                        <button
                          onClick={() =>
                            setSelectedSlot({
                              court,
                              startsAt: row.startsAt,
                              endsAt: row.endsAt,
                              timeLabel: `${row.startTimeStr} - ${row.endTimeStr}`,
                            })
                          }
                          className={`w-full py-2 px-3 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#C8F13A] text-[#07271D] ring-2 ring-white shadow-md scale-95"
                              : "bg-[#07271D] hover:bg-[#C8F13A] text-[#C8F13A] hover:text-[#07271D] border border-[#C8F13A]/30"
                          }`}
                        >
                          {isSelected ? "Selected" : "Book Slot"}
                        </button>
                      ) : (
                        <span className="inline-block w-full py-2 px-3 rounded-xl bg-white/5 text-[#F4F1EA]/30 font-medium text-[11px] uppercase tracking-wider">
                          Reserved
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
