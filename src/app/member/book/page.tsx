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
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const member = await prisma.member.findUnique({
    where: { userId: user.id },
  });

  if (!member) {
    redirect("/login");
  }

  const { date } = await searchParams;
  const todayStr = formatKolkataDate(new Date());
  const selectedDate = date || todayStr;

  const [entitlement, availability] = await Promise.all([
    resolve(member.id, new Date()),
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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B1B1B]">
          Book a <span className="text-[#5F9E4A]">court</span>
        </h1>
        <p className="text-xs text-[#1B1B1B]/70">
          Pick your sport, choose an open slot, and lock in your session.
        </p>
      </div>

      <MemberCourtBooking
        initialDate={selectedDate}
        courts={availability.courts}
        slots={formattedSlots}
        discountPct={entitlement.courtDiscountPct}
        bookingsLeftToday={entitlement.bookingsLeftToday}
        planName={entitlement.plan?.name}
      />
    </div>
  );
}
