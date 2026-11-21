import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getCourtAvailability, formatKolkataDate } from "@/lib/services/booking";
import { CourtScheduleGrid } from "@/components/courts/court-schedule-grid";

export const dynamic = "force-dynamic";

export default async function AdminCourtsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { date } = await searchParams;
  const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : formatKolkataDate(new Date());

  const [availability, pricingRules] = await Promise.all([
    getCourtAvailability(targetDate),
    prisma.pricingRule.findMany({
      where: { planId: null },
    }),
  ]);

  const pricingBySport: Record<string, number> = {
    TENNIS: 1200,
    PADEL: 1600,
    BADMINTON: 600,
  };

  for (const rule of pricingRules) {
    pricingBySport[rule.sport.toUpperCase()] = Number(rule.basePrice);
  }

  return (
    <CourtScheduleGrid
      initialDate={targetDate}
      data={availability}
      isOwner={user.role === "OWNER"}
      pricingBySport={pricingBySport}
    />
  );
}
