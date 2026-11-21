"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, X } from "lucide-react";

interface TransactionFilterRowProps {
  currentSearch?: string;
  currentRange?: string;
  currentFrom?: string;
  currentTo?: string;
  currentSource?: string;
  currentKind?: string;
  currentMethod?: string;
  csvUrl: string;
}

export function TransactionFilterRow({
  currentSearch = "",
  currentRange = "month",
  currentFrom = "",
  currentTo = "",
  currentSource = "",
  currentKind = "",
  currentMethod = "",
  csvUrl,
}: TransactionFilterRowProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [dateRange, setDateRange] = useState(currentFrom || currentTo ? "custom" : currentRange || "month");
  const [from, setFrom] = useState(currentFrom);
  const [to, setTo] = useState(currentTo);
  const [source, setSource] = useState(currentSource);
  const [kind, setKind] = useState(currentKind);
  const [method, setMethod] = useState(currentMethod);

  const applyFilters = (overrides: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams();
    const s = overrides.search !== undefined ? overrides.search : search;
    const r = overrides.dateRange !== undefined ? overrides.dateRange : dateRange;
    const f = overrides.from !== undefined ? overrides.from : from;
    const t = overrides.to !== undefined ? overrides.to : to;
    const src = overrides.source !== undefined ? overrides.source : source;
    const k = overrides.kind !== undefined ? overrides.kind : kind;
    const m = overrides.method !== undefined ? overrides.method : method;

    if (s.trim()) params.set("q", s.trim());
    if (r === "custom") {
      if (f) params.set("from", f);
      if (t) params.set("to", t);
    } else if (r) {
      params.set("range", r);
    }
    if (src) params.set("source", src);
    if (k) params.set("kind", k);
    if (m) params.set("method", m);
    params.set("page", "1");

    router.push(`/admin/transactions?${params.toString()}`);
  };

  const handleReset = () => {
    setSearch("");
    setDateRange("month");
    setFrom("");
    setTo("");
    setSource("");
    setKind("");
    setMethod("");
    router.push("/admin/transactions?range=month&page=1");
  };

  return (
    <div className="bg-white border border-[#E2E8F0] p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Filters Left */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
        {/* Search */}
        <div className="relative w-48 sm:w-56">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#64748B]" />
          <Input
            placeholder="Search ref or member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters({ search: e.currentTarget.value });
            }}
            onBlur={() => applyFilters()}
            className="pl-8 h-8 text-xs bg-white border-[#E2E8F0]"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                applyFilters({ search: "" });
              }}
              className="absolute right-2 top-2 text-[#94A3B8] hover:text-[#0F172A]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Date Range Select */}
        <select
          value={dateRange}
          onChange={(e) => {
            const val = e.target.value;
            setDateRange(val);
            if (val !== "custom") {
              applyFilters({ dateRange: val, from: "", to: "" });
            }
          }}
          className="h-8 px-2.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-hidden"
        >
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="custom">Custom range</option>
        </select>

        {/* Custom date inputs if selected */}
        {dateRange === "custom" && (
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                applyFilters({ from: e.target.value });
              }}
              className="h-8 text-xs w-32 border-[#E2E8F0]"
            />
            <span className="text-[#64748B]">to</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                applyFilters({ to: e.target.value });
              }}
              className="h-8 text-xs w-32 border-[#E2E8F0]"
            />
          </div>
        )}

        {/* Source Select */}
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            applyFilters({ source: e.target.value });
          }}
          className="h-8 px-2.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-hidden"
        >
          <option value="">All Sources</option>
          <option value="COURT">Courts</option>
          <option value="SHOP">Pro Shop</option>
          <option value="BAR">Bar & Café</option>
          <option value="MEMBERSHIP">Membership</option>
        </select>

        {/* Kind Select */}
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            applyFilters({ kind: e.target.value });
          }}
          className="h-8 px-2.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-hidden"
        >
          <option value="">All Types</option>
          <option value="COLLECTED">Collected</option>
          <option value="EARNED">Earned</option>
          <option value="REFUNDED">Refunded</option>
        </select>

        {/* Method Select */}
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            applyFilters({ method: e.target.value });
          }}
          className="h-8 px-2.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#0F172A] focus:outline-hidden"
        >
          <option value="">All Methods</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="UPI">UPI</option>
          <option value="ONLINE">Online</option>
        </select>

        {/* Reset text button */}
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-[#64748B] hover:text-[#0F172A] px-2 py-1 rounded hover:bg-[#F1F5F9] transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Export CSV Right */}
      <div>
        <a href={csvUrl} download>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-[#E2E8F0] text-[#0F172A]">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </a>
      </div>
    </div>
  );
}
