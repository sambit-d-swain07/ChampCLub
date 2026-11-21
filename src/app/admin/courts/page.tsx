import { getCourtAvailability, formatKolkataDate } from "@/lib/services/booking";
import { searchMembers } from "@/lib/services/members";
import { CourtScheduleGrid } from "@/components/courts/court-schedule-grid";

export const dynamic = "force-dynamic";

export default async function AdminCourtsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : formatKolkataDate(new Date());

  const [availability, membersData] = await Promise.all([
    getCourtAvailability(targetDate),
    searchMembers("", 1, 100),
  ]);

  return <CourtScheduleGrid initialDate={targetDate} data={availability} members={membersData.members} />;
}
