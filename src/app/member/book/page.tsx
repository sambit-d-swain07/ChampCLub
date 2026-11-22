import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { getCourtAvailability, formatKolkataDate } from "@/lib/services/booking";
import { MemberCourtBooking } from "@/components/member/member-court-booking";

export const dynamic = "force-dynamic";

export default async function MemberBookPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; date?: string; time?: string; court?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const member = await prisma.member.findUnique({
    where: { userId: user.id },
    include: {
      user: true,
      memberships: {
        where: { replacedAt: null },
        include: { plan: true },
        orderBy: { startsAt: "desc" },
        take: 1,
      },
    },
  });

  if (!member) {
    redirect("/login");
  }

  const params = await searchParams;
  const todayStr = formatKolkataDate(new Date());
  const selectedDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayStr;

  // Resolve member's last booking sport to default if none in URL
  const lastBooking = await prisma.booking.findFirst({
    where: { memberId: member.id, status: { not: "CANCELLED" } },
    include: { court: true },
    orderBy: { startsAt: "desc" },
  });
  const fallbackSport = lastBooking?.court.sport || "TENNIS";
  const initialSport = (params.sport || fallbackSport).toUpperCase();

  // Target date for entitlement calculation (computes daily quota for this specific day)
  const targetDateObj = new Date(`${selectedDate}T12:00:00Z`);

  // Single parallel server query for availability and entitlement
  const [entitlement, availability] = await Promise.all([
    resolve(member.id, targetDateObj),
    getCourtAvailability(selectedDate),
  ]);

  const formattedSlots = availability.rows.map((s) => ({
    slotKey: s.slotKey,
    startTimeStr: s.startTimeStr,
    endTimeStr: s.endTimeStr,
    startsAt: s.startsAt,
    endsAt: s.endsAt,
    courtSlots: s.courts.map((cs) => ({
      courtId: cs.courtId,
      status: cs.status === "SOCIAL" ? ("CONFIRMED" as const) : cs.status,
      bookingId: cs.booking?.id || null,
    })),
  }));

  const isJuniorUnverified = Boolean(
    entitlement.plan?.name.toUpperCase().includes("JUNIOR") && !entitlement.ageVerified
  );

  const dailyLimit = entitlement.plan?.name.toUpperCase() === "GOLD" ? 4 : 2;

  return (
    <div className="max-w-[1344px] mx-auto">
      <MemberCourtBooking
        initialSport={initialSport}
        initialDate={selectedDate}
        initialTime={params.time || null}
        initialCourtId={params.court || "ANY"}
        courts={availability.courts}
        slots={formattedSlots}
        discountPct={entitlement.courtDiscountPct}
        planName={entitlement.plan?.name || null}
        isJuniorUnverified={isJuniorUnverified}
        bookingsLeftToday={entitlement.bookingsLeftToday}
        dailyLimit={dailyLimit}
        maxBookingDays={30}
      />
    </div>
  );
}
