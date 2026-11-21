import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MemberBookingsList } from "@/components/member/member-bookings-list";

export const dynamic = "force-dynamic";

export default async function MemberBookingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const member = await prisma.member.findUnique({
    where: { userId: user.id },
    include: {
      bookings: {
        include: { court: true },
        orderBy: { startsAt: "desc" },
      },
    },
  });

  if (!member) {
    redirect("/login");
  }

  const now = Date.now();

  const formattedBookings = member.bookings.map((b) => {
    const startTime = new Date(b.startsAt).getTime();
    const hoursUntilStart = (startTime - now) / (1000 * 60 * 60);
    const canCancel = hoursUntilStart >= 24 && b.status === "CONFIRMED";
    const pricePaid = Math.max(0, Number(b.priceSnapshot) - Number(b.discountSnapshot));

    return {
      id: b.id,
      courtName: b.court.name,
      sport: b.court.sport,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      status: b.status,
      kind: b.kind,
      pricePaid,
      canCancel,
      hoursUntilStart,
    };
  });

  // Fetch upcoming Friday social sessions
  const socialSessions = await prisma.booking.findMany({
    where: {
      kind: "SOCIAL",
      status: "CONFIRMED",
      startsAt: { gte: new Date() },
    },
    include: {
      court: true,
      participants: true,
    },
    orderBy: { startsAt: "asc" },
    take: 4,
  });

  const formattedSocial = socialSessions.map((s) => ({
    id: s.id,
    courtName: s.court.name,
    sport: s.court.sport,
    startsAt: s.startsAt.toISOString(),
    endsAt: s.endsAt.toISOString(),
    pricePerPerson: Number(s.priceSnapshot),
    capacity: s.court.capacity,
    participantCount: s.participants.length,
    isJoined: s.participants.some((p) => p.memberId === member.id),
  }));

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <MemberBookingsList
        bookings={formattedBookings}
        socialSessions={formattedSocial}
      />
    </div>
  );
}
