"use client";

import { useState, useEffect, useRef } from "react";
import { lookupMemberByIdAction } from "@/app/actions/members";
import { Search, X, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";

export interface ResolvedMember {
  id: string;
  name: string;
  membershipNo: string;
  planName: string;
  status: "ACTIVE" | "GRACE" | "EXPIRED" | "WALK_IN";
  courtDiscountPct: number;
  shopDiscountPct: number;
  barDiscountPct: number;
  bookingsLeftToday: number;
}

interface MemberIdInputProps {
  onMemberResolved: (member: ResolvedMember | null) => void;
  showBookingsLeft?: boolean;
  placeholder?: string;
  className?: string;
}

export function MemberIdInput({
  onMemberResolved,
  showBookingsLeft = false,
  placeholder = "CC-2026-002 or scan QR",
  className = "",
}: MemberIdInputProps) {
  const [query, setQuery] = useState("");
  const [resolvedMember, setResolvedMember] = useState<ResolvedMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleLookup = async (text: string) => {
    const clean = text.trim().toUpperCase();
    if (!clean) {
      setResolvedMember(null);
      setError(null);
      setIsBanned(false);
      onMemberResolved(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsBanned(false);

    try {
      const res = await lookupMemberByIdAction(clean);
      if (res.success && res.member) {
        setResolvedMember(res.member);
        setError(null);
        setIsBanned(false);
        onMemberResolved(res.member);
      } else {
        setResolvedMember(null);
        setError(res.error || "No member found with this ID");
        setIsBanned(Boolean(res.banned));
        onMemberResolved(null);
      }
    } catch {
      setResolvedMember(null);
      setError("Failed to verify member ID");
      setIsBanned(false);
      onMemberResolved(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!val.trim()) {
      setResolvedMember(null);
      setError(null);
      setIsBanned(false);
      onMemberResolved(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      handleLookup(val);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      handleLookup(query);
    }
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery("");
    setResolvedMember(null);
    setError(null);
    setIsBanned(false);
    onMemberResolved(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/80">
        Member ID / QR Token
      </label>

      {/* Input row */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search className="h-4 w-4" />
        </div>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={Boolean(resolvedMember)}
          className={`w-full pl-9 pr-9 py-2 text-sm font-mono uppercase rounded-xl border bg-white text-[#1B1B1B] placeholder:text-gray-400 placeholder:normal-case focus:outline-none focus:ring-2 transition-all ${
            isBanned
              ? "border-red-500 focus:ring-red-500/20 bg-red-50/30"
              : resolvedMember
              ? "border-emerald-500 focus:ring-emerald-500/20 bg-emerald-50/20"
              : error
              ? "border-amber-400 focus:ring-amber-400/20"
              : "border-gray-200 focus:ring-[#1B1B1B]/15"
          }`}
        />

        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}

        {(query || resolvedMember) && !isLoading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error / Banned Message */}
      {error && (
        <div
          className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            isBanned
              ? "bg-red-50 border border-red-200 text-red-700"
              : "bg-amber-50 border border-amber-200 text-amber-800"
          }`}
        >
          {isBanned ? (
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          )}
          <span>{error}</span>
        </div>
      )}

      {/* Verified Member Result Card */}
      {resolvedMember && (
        <div className="p-3 rounded-xl bg-[#F6F5E1]/70 border border-[#1B1B1B]/15 space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-bold text-[#1B1B1B]">{resolvedMember.name}</span>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-[#1B1B1B]/15 text-[#1B1B1B]">
              {resolvedMember.membershipNo}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                resolvedMember.status === "ACTIVE"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : resolvedMember.status === "GRACE"
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300"
              }`}
            >
              {resolvedMember.status === "ACTIVE"
                ? `Active â€¢ ${resolvedMember.planName}`
                : resolvedMember.status === "GRACE"
                ? `Grace â€¢ ${resolvedMember.planName}`
                : resolvedMember.status === "EXPIRED"
                ? "Expired"
                : "No Plan"}
            </span>

            <span className="text-[11px] text-[#1B1B1B]/70 font-medium">
              Discounts: {resolvedMember.courtDiscountPct}% court, {resolvedMember.shopDiscountPct}% shop, {resolvedMember.barDiscountPct}% bar
            </span>
          </div>

          {showBookingsLeft && (
            <div className="text-[11px] font-semibold text-[#1B1B1B]/80 pt-0.5">
              Bookings left today: <span className="text-[#1B1B1B]">{resolvedMember.bookingsLeftToday}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
