export interface SiteSettings {
  name: string;
  tagline: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  hours: string;
}

export const siteSettings: SiteSettings = {
  name: "Champions Club",
  tagline: "Tennis, padel and badminton, with a shop and a bar for after the match.",
  address: process.env.NEXT_PUBLIC_CLUB_ADDRESS || "124 Club Crescent, Indiranagar",
  city: process.env.NEXT_PUBLIC_CLUB_CITY || "Bengaluru, KA 560038",
  phone: process.env.NEXT_PUBLIC_CLUB_PHONE || "+91 80 4910 8800",
  email: process.env.NEXT_PUBLIC_CLUB_EMAIL || "concierge@thechampionsclub.in",
  hours: "Open daily · 6:00 am to 10:00 pm",
};

/**
 * Format currency with Indian number grouping and symbol: ₹1,23,456
 */
export function formatInr(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return `₹${num.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * Format currency with Indian number grouping and 2 decimal places: ₹1,70,782.10
 */
export function formatInrPrecise(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format dates as "22 Nov 2026"
 */
export function formatClubDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Format times as 12-hour with am/pm (e.g. "6:00 am")
 */
export function formatClubTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).toLowerCase();
}
