"use server";
import { createBooking, confirmBooking } from "@/lib/services/booking";
import { prisma } from "@/lib/prisma";

export async function bookTrialAction(data: {
  courtId: string;
  startsAt: string;
  endsAt: string;
  guestName: string;
  email?: string;
  phone?: string;
}) {
  const booking = await createBooking({
    courtId: data.courtId,
    startsAt: new Date(data.startsAt),
    endsAt: new Date(data.endsAt),
    memberId: null,
    guestName: data.guestName,
    kind: "NORMAL",
  });

  if (!booking.success || !booking.booking) {
    return { success: false as const, error: booking.error ?? "Failed to reserve slot." };
  }

  const confirmed = await confirmBooking({
    bookingId: booking.booking.id,
    paymentMethod: "CASH",
  });

  if (!confirmed.success) {
    return { success: false as const, error: confirmed.error ?? "Failed to confirm booking." };
  }

  const lead = await prisma.lead.create({
    data: {
      name: data.guestName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      source: "TRIAL_BOOKING",
      status: "NEW",
      trialBookingId: booking.booking.id,
    },
  });

  return { success: true as const, bookingId: booking.booking.id, leadId: lead.id };
}
