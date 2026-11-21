"use client";
import { useState } from "react";
import { bookTrialAction } from "@/app/actions/trial";

type Sport = "TENNIS" | "PADEL" | "BADMINTON";

interface SlotOption {
  courtId: string;
  courtName: string;
  sport: string;
  startTimeStr: string;
  endTimeStr: string;
  startsAt: string;
  endsAt: string;
}

interface BookingResult {
  success: true;
  bookingId: string;
  leadId: string;
}

const SPORTS: { value: Sport; label: string; icon: string; desc: string }[] = [
  { value: "TENNIS", label: "Tennis", icon: "🎾", desc: "Championship acrylic courts" },
  { value: "PADEL", label: "Padel", icon: "🏓", desc: "Panoramic glass arenas" },
  { value: "BADMINTON", label: "Badminton", icon: "🏸", desc: "Teakwood & synthetic courts" },
];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function TrialPage() {
  const [step, setStep] = useState(1);
  const [sport, setSport] = useState<Sport | null>(null);
  const [date, setDate] = useState(todayISO());
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null);
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);

  async function fetchSlots(d: string, s: Sport) {
    setSlotsLoading(true);
    setSlotsError("");
    setSlots([]);
    try {
      const res = await fetch(`/api/courts/availability?date=${d}`);
      if (!res.ok) throw new Error("Failed to load availability.");
      const data = await res.json();

      // data = { courts: [...], rows: [...] }
      const courtColumns: { id: string; name: string; sport: string }[] =
        data.courts ?? [];
      const gridRows: Array<{
        startTimeStr: string;
        endTimeStr: string;
        startsAt: string;
        endsAt: string;
        courts: Array<{ courtId: string; status: string }>;
      }> = data.rows ?? [];

      // Filter courts by sport
      const matchingCourts = courtColumns.filter(
        (c) => c.sport.toUpperCase() === s
      );

      const freeSlots: SlotOption[] = [];
      for (const row of gridRows) {
        for (const cs of row.courts) {
          const court = matchingCourts.find((c) => c.id === cs.courtId);
          if (!court) continue;
          if (cs.status === "FREE") {
            freeSlots.push({
              courtId: court.id,
              courtName: court.name,
              sport: court.sport,
              startTimeStr: row.startTimeStr,
              endTimeStr: row.endTimeStr,
              startsAt: row.startsAt,
              endsAt: row.endsAt,
            });
          }
        }
      }

      setSlots(freeSlots);
    } catch (e: unknown) {
      setSlotsError(e instanceof Error ? e.message : "Failed to load slots.");
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedSlot || !guestName.trim()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await bookTrialAction({
        courtId: selectedSlot.courtId,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        guestName: guestName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      if (!res.success) {
        setSubmitError(res.error ?? "Booking failed. Please try again.");
      } else {
        setResult(res as BookingResult);
        setStep(6);
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 6 && result) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-20" style={{ background: "#F0F4EF" }}>
        <div className="max-w-md w-full text-center bg-white rounded-2xl border border-[#2D6A4F]/20 p-10 shadow-lg">
          <div className="text-5xl mb-5">🎉</div>
          <h2 className="text-2xl font-black text-[#0F2A1F] mb-2">Trial Booked!</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Your free trial is confirmed. See you on the court,{" "}
            <strong>{guestName}</strong>!
          </p>
          <div className="rounded-xl bg-[#F0F4EF] p-5 text-left space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-gray-500">Sport</span>
              <span className="font-semibold text-[#0F2A1F]">{selectedSlot?.sport}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Court</span>
              <span className="font-semibold text-[#0F2A1F]">{selectedSlot?.courtName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date</span>
              <span className="font-semibold text-[#0F2A1F]">{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Time</span>
              <span className="font-semibold text-[#0F2A1F]">
                {selectedSlot?.startTimeStr} – {selectedSlot?.endTimeStr}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Booking Ref</span>
              <span className="font-mono text-xs text-[#2D6A4F]">{result.bookingId.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Our team will reach out to confirm. Payment of trial fee is at the desk on arrival.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F0F4EF" }}>
      {/* Header */}
      <div
        className="py-14 px-6 text-center"
        style={{ background: "linear-gradient(135deg, #0F2A1F, #1A3D2B)" }}
      >
        <h1
          className="text-3xl sm:text-5xl font-black text-white tracking-tight"
          style={{ fontFamily: "system-ui, Inter, sans-serif" }}
        >
          Book Your Free Trial
        </h1>
        <p className="mt-3 text-[#74C69D] text-sm max-w-sm mx-auto">
          Try any court for free — no membership required.
        </p>
      </div>

      {/* Step indicator */}
      <div className="max-w-2xl mx-auto px-6 mt-8">
        <div className="flex items-center gap-2 mb-8">
          {["Sport", "Date", "Slot", "Details", "Confirm"].map((label, i) => {
            const s = i + 1;
            const active = step === s;
            const done = step > s;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: done ? "#2D6A4F" : active ? "#0F2A1F" : "#ddd",
                      color: done || active ? "#fff" : "#999",
                    }}
                  >
                    {done ? "✓" : s}
                  </div>
                  <span
                    className="text-xs font-medium hidden sm:block"
                    style={{ color: active ? "#0F2A1F" : done ? "#2D6A4F" : "#aaa" }}
                  >
                    {label}
                  </span>
                </div>
                {i < 4 && (
                  <div
                    className="flex-1 h-px"
                    style={{ background: done ? "#2D6A4F" : "#ddd" }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Sport ───────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-[#0F2A1F] mb-5">Choose your sport</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {SPORTS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setSport(s.value);
                    setSelectedSlot(null);
                    setSlots([]);
                  }}
                  className="rounded-xl p-6 text-left border-2 transition-all focus:outline-none"
                  style={{
                    border:
                      sport === s.value ? "2px solid #2D6A4F" : "2px solid transparent",
                    background: sport === s.value ? "#0F2A1F" : "#fff",
                    boxShadow:
                      sport === s.value ? "0 4px 20px rgba(45,106,79,0.2)" : undefined,
                  }}
                >
                  <div className="text-4xl mb-3">{s.icon}</div>
                  <div
                    className="font-bold text-base mb-0.5"
                    style={{ color: sport === s.value ? "#74C69D" : "#0F2A1F" }}
                  >
                    {s.label}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: sport === s.value ? "#74C69D99" : "#666" }}
                  >
                    {s.desc}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-6">
              <button
                disabled={!sport}
                onClick={() => setStep(2)}
                className="w-full py-3 rounded-lg font-bold text-sm transition-opacity disabled:opacity-40"
                style={{ background: "#0F2A1F", color: "#74C69D" }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Date ─────────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-[#0F2A1F] mb-5">Pick a date</h2>
            <div className="bg-white rounded-xl border border-[#2D6A4F]/20 p-6">
              <label className="block text-xs font-semibold text-[#2D6A4F] mb-2">
                Select date
              </label>
              <input
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2D6A4F]"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-lg font-semibold text-sm border border-[#2D6A4F]/30 text-[#0F2A1F] hover:bg-white transition-colors"
              >
                Back
              </button>
              <button
                disabled={!date}
                onClick={async () => {
                  setStep(3);
                  await fetchSlots(date, sport!);
                }}
                className="flex-1 py-3 rounded-lg font-bold text-sm transition-opacity disabled:opacity-40"
                style={{ background: "#0F2A1F", color: "#74C69D" }}
              >
                See available slots
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Slot ─────────────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-[#0F2A1F] mb-1">
              Available {sport?.toLowerCase()} slots
            </h2>
            <p className="text-xs text-gray-500 mb-5">{date}</p>

            {slotsLoading && (
              <div className="text-center py-16 text-sm text-gray-500">
                Checking court availability…
              </div>
            )}

            {slotsError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
                {slotsError}
              </div>
            )}

            {!slotsLoading && !slotsError && slots.length === 0 && (
              <div className="text-center py-16 text-sm text-gray-500">
                No free slots available for {sport?.toLowerCase()} on {date}. Try another date.
              </div>
            )}

            {!slotsLoading && slots.length > 0 && (
              <div className="space-y-3">
                {/* Group by court */}
                {Array.from(new Set(slots.map((s) => s.courtId))).map((courtId) => {
                  const courtSlots = slots.filter((s) => s.courtId === courtId);
                  const courtName = courtSlots[0].courtName;
                  return (
                    <div
                      key={courtId}
                      className="bg-white rounded-xl border border-[#2D6A4F]/15 p-5"
                    >
                      <div className="text-xs font-semibold text-[#2D6A4F] mb-3">{courtName}</div>
                      <div className="flex flex-wrap gap-2">
                        {courtSlots.map((sl) => {
                          const isSelected =
                            selectedSlot?.courtId === sl.courtId &&
                            selectedSlot?.startsAt === sl.startsAt;
                          return (
                            <button
                              key={sl.courtId + sl.startsAt}
                              onClick={() => setSelectedSlot(sl)}
                              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all border"
                              style={{
                                background: isSelected ? "#0F2A1F" : "#F0F4EF",
                                color: isSelected ? "#74C69D" : "#0F2A1F",
                                borderColor: isSelected ? "#2D6A4F" : "transparent",
                              }}
                            >
                              {sl.startTimeStr} – {sl.endTimeStr}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-lg font-semibold text-sm border border-[#2D6A4F]/30 text-[#0F2A1F] hover:bg-white transition-colors"
              >
                Back
              </button>
              <button
                disabled={!selectedSlot}
                onClick={() => setStep(4)}
                className="flex-1 py-3 rounded-lg font-bold text-sm transition-opacity disabled:opacity-40"
                style={{ background: "#0F2A1F", color: "#74C69D" }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Guest details ─────────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-[#0F2A1F] mb-5">Your details</h2>
            <div className="bg-white rounded-xl border border-[#2D6A4F]/20 p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#2D6A4F] mb-1.5">
                  Full name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2D6A4F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D6A4F] mb-1.5">
                  Email <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2D6A4F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2D6A4F] mb-1.5">
                  Phone <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2D6A4F]"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-lg font-semibold text-sm border border-[#2D6A4F]/30 text-[#0F2A1F] hover:bg-white transition-colors"
              >
                Back
              </button>
              <button
                disabled={!guestName.trim()}
                onClick={() => setStep(5)}
                className="flex-1 py-3 rounded-lg font-bold text-sm transition-opacity disabled:opacity-40"
                style={{ background: "#0F2A1F", color: "#74C69D" }}
              >
                Review booking
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Confirm ───────────────────────────────────────────────── */}
        {step === 5 && selectedSlot && (
          <div>
            <h2 className="text-lg font-bold text-[#0F2A1F] mb-5">Confirm your trial</h2>
            <div className="bg-white rounded-xl border border-[#2D6A4F]/20 p-6 space-y-3 mb-5">
              {[
                ["Sport", sport],
                ["Court", selectedSlot.courtName],
                ["Date", date],
                ["Time", `${selectedSlot.startTimeStr} – ${selectedSlot.endTimeStr}`],
                ["Name", guestName],
                email ? ["Email", email] : null,
                phone ? ["Phone", phone] : null,
              ]
                .filter(Boolean)
                .map((row) => (
                  <div key={row![0]} className="flex justify-between text-sm">
                    <span className="text-gray-500 text-xs">{row![0]}</span>
                    <span className="font-semibold text-[#0F2A1F] text-xs">{row![1]}</span>
                  </div>
                ))}
              <div className="border-t border-[#2D6A4F]/10 pt-3 flex justify-between text-sm">
                <span className="text-gray-500 text-xs">Trial fee</span>
                <span className="font-bold text-[#0F2A1F] text-xs">Pay at the desk on arrival</span>
              </div>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-4">
                {submitError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(4)}
                disabled={submitting}
                className="flex-1 py-3 rounded-lg font-semibold text-sm border border-[#2D6A4F]/30 text-[#0F2A1F] hover:bg-white transition-colors disabled:opacity-40"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-lg font-bold text-sm transition-opacity disabled:opacity-40"
                style={{ background: "#0F2A1F", color: "#74C69D" }}
              >
                {submitting ? "Booking…" : "Confirm trial booking"}
              </button>
            </div>
          </div>
        )}

        <div className="pb-16" />
      </div>
    </div>
  );
}
