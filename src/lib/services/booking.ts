import { prisma } from "@/lib/prisma";
import { resolve } from "@/lib/services/entitlement";
import { Prisma } from "@prisma/client";

export const CLUB_CONFIG = {
  timezone: "Asia/Kolkata",
  openHour: 6, // 06:00 AM
  closeHour: 22, // 10:00 PM
  slotDurationMinutes: 60, // 60 min session
  slotIntervalMinutes: 30, // Starts every 30 min
  holdDurationMinutes: 5, // 5 min hold
  maxDailyBookingsPerMember: 2, // Max 2 per member per day
  selfCancelCutoffHours: 24, // 24 hours prior
};

export interface TimeSlot {
  slotKey: string; // e.g. "06:00"
  startTimeStr: string; // "06:00"
  endTimeStr: string; // "07:00"
  startsAt: Date;
  endsAt: Date;
}

/**
 * Returns date range (start of day to end of day) in UTC corresponding to local Asia/Kolkata date YYYY-MM-DD.
 * Asia/Kolkata is UTC+05:30.
 */
export function getKolkataDayRange(dateStr: string): { startUtc: Date; endUtc: Date } {
  // e.g. dateStr = "2026-11-21"
  const startUtc = new Date(`${dateStr}T00:00:00+05:30`);
  const endUtc = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { startUtc, endUtc };
}

/**
 * Formats a Date into Asia/Kolkata YYYY-MM-DD string.
 */
export function formatKolkataDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_CONFIG.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Generates all 60-minute slots starting every 30 minutes from openHour to (closeHour - 1).
 */
export function generateDaySlots(dateStr: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startHour = CLUB_CONFIG.openHour;
  const endHour = CLUB_CONFIG.closeHour;

  for (let hour = startHour; hour < endHour; hour++) {
    for (const minute of [0, 30]) {
      // If hour is (endHour - 1) and minute is 30, session would end at endHour:30, exceeding closing time
      if (hour === endHour - 1 && minute > 0) continue;

      const hourPad = String(hour).padStart(2, "0");
      const minPad = String(minute).padStart(2, "0");
      const startSlotStr = `${hourPad}:${minPad}`;

      // End time 60 minutes later
      const endH = hour + 1;
      const endM = minute;
      const endSlotStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      const startsAt = new Date(`${dateStr}T${startSlotStr}:00+05:30`);
      const endsAt = new Date(startsAt.getTime() + CLUB_CONFIG.slotDurationMinutes * 60 * 1000);

      slots.push({
        slotKey: startSlotStr,
        startTimeStr: startSlotStr,
        endTimeStr: endSlotStr,
        startsAt,
        endsAt,
      });
    }
  }

  return slots;
}

/**
 * Lazy cleanup: cancels any expired holds so slots are freed up without background cron.
 */
export async function lazyCleanupExpiredHolds(tx?: Prisma.TransactionClient): Promise<number> {
  const client = tx || prisma;
  const res = await client.booking.updateMany({
    where: {
      status: "HELD",
      holdExpiresAt: { lt: new Date() },
    },
    data: {
      status: "CANCELLED",
    },
  });
  return res.count;
}

/**
 * Creates a court booking inside a Prisma transaction:
 * 1. Takes pg_advisory_xact_lock on (memberId, local date)
 * 2. Cleans up expired holds lazily
 * 3. Re-checks the daily limit (max 2 non-cancelled bookings per member per day)
 * 4. Computes pricing from PricingRule and entitlement
 * 5. Inserts as HELD with 5-minute holdExpiresAt
 * 6. Catches exclusion constraint violation if slot was taken concurrently
 */
export async function createBooking(data: {
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  memberId?: string | null;
  guestName?: string | null;
  kind?: "NORMAL" | "SOCIAL";
}) {
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);

  // Validate exact 60-minute duration
  const diffMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / (1000 * 60));
  if (diffMinutes !== 60) {
    return { success: false, error: "Court sessions must be exactly 60 minutes." };
  }

  // Validate start minutes (:00 or :30)
  const kolkataDateStr = formatKolkataDate(startsAt);
  const { startUtc, endUtc } = getKolkataDayRange(kolkataDateStr);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Lazy cleanup of expired holds in this transaction
        await tx.booking.updateMany({
          where: {
            status: "HELD",
            holdExpiresAt: { lt: new Date() },
          },
          data: {
            status: "CANCELLED",
          },
        });

        // 2. Daily limit enforcement with advisory transaction lock
        if (data.memberId) {
          // Lock on memberId + local date to serialize concurrent requests for the same member
          const lockKey = `${data.memberId}:${kolkataDateStr}`;
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

          // Re-check member's daily bookings (NORMAL bookings)
          const normalBookingsCount = await tx.booking.count({
            where: {
              memberId: data.memberId,
              startsAt: { gte: startUtc, lte: endUtc },
              status: { in: ["HELD", "CONFIRMED"] },
            },
          });

          // Also check social play participations for this member on that day
          const socialParticipationsCount = await tx.bookingParticipant.count({
            where: {
              memberId: data.memberId,
              booking: {
                startsAt: { gte: startUtc, lte: endUtc },
                status: "CONFIRMED",
              },
            },
          });

          const totalSessionsToday = normalBookingsCount + socialParticipationsCount;
          if (totalSessionsToday >= CLUB_CONFIG.maxDailyBookingsPerMember) {
            throw new Error(
              `Daily booking limit reached. Members are permitted a maximum of ${CLUB_CONFIG.maxDailyBookingsPerMember} court sessions per day.`
            );
          }
        }

        // 3. Fetch Court & Pricing Rule
        const court = await tx.court.findUniqueOrThrow({
          where: { id: data.courtId },
        });

        // Find pricing rule for sport
        const pricingRule = await tx.pricingRule.findFirst({
          where: { sport: court.sport },
          orderBy: { createdAt: "desc" },
        });

        const basePrice = pricingRule ? Number(pricingRule.basePrice) : 1000;
        let discountPct = 0;

        if (data.memberId) {
          const ent = await resolve(data.memberId, startsAt);
          discountPct = ent.courtDiscountPct;
        }

        const discountSnapshot = (basePrice * discountPct) / 100;
        const priceSnapshot = basePrice;
        const holdExpiresAt = new Date(Date.now() + CLUB_CONFIG.holdDurationMinutes * 60 * 1000);

        // 4. Create Booking as HELD
        const booking = await tx.booking.create({
          data: {
            courtId: data.courtId,
            memberId: data.memberId || null,
            guestName: data.memberId ? null : data.guestName || "Walk-in Guest",
            startsAt,
            endsAt,
            status: "HELD",
            kind: data.kind || "NORMAL",
            priceSnapshot,
            discountSnapshot,
            holdExpiresAt,
          },
          include: {
            court: true,
            member: {
              include: { user: true },
            },
          },
        });

        return booking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      }
    );

    return { success: true, booking: result };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Exclusion constraint violation in Postgres (code 23P01) or overlapping error
    if (
      errorMsg.includes("no_overlapping_normal_bookings") ||
      errorMsg.includes("23P01") ||
      errorMsg.includes("exclusion") ||
      errorMsg.includes("overlap")
    ) {
      return {
        success: false,
        error: "This court slot was just taken by another player. Please select another slot.",
      };
    }

    if (errorMsg.includes("Daily booking limit reached")) {
      return { success: false, error: errorMsg };
    }

    return {
      success: false,
      error: errorMsg || "Failed to reserve court slot.",
    };
  }
}

/**
 * Confirms a HELD booking, marks CONFIRMED, and writes COURT ledger entries (EARNED + COLLECTED).
 */
export async function confirmBooking(data: {
  bookingId: string;
  paymentMethod: "CASH" | "CARD" | "UPI" | "ONLINE";
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lazy cleanup of other expired holds
      await tx.booking.updateMany({
        where: {
          status: "HELD",
          holdExpiresAt: { lt: new Date() },
          id: { not: data.bookingId },
        },
        data: {
          status: "CANCELLED",
        },
      });

      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: data.bookingId },
        include: { court: true, member: { include: { user: true } } },
      });

      // Verify hold has not expired
      if (booking.status === "HELD" && booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED" },
        });
        throw new Error("Your 5-minute reservation hold has expired. Please select the slot again.");
      }

      if (booking.status === "CANCELLED") {
        throw new Error("This booking has been cancelled.");
      }

      // Mark CONFIRMED and clear holdExpiresAt
      const confirmed = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          holdExpiresAt: null,
        },
        include: {
          court: true,
          member: { include: { user: true } },
        },
      });

      const netPrice = Math.max(
        0,
        Number(confirmed.priceSnapshot) - Number(confirmed.discountSnapshot)
      );

      // Write COURT ledger entries: EARNED + COLLECTED
      await tx.ledgerEntry.create({
        data: {
          source: "COURT",
          amount: netPrice,
          method: data.paymentMethod,
          kind: "EARNED",
          refType: "BOOKING",
          refId: confirmed.id,
          createdAt: new Date(),
        },
      });

      await tx.ledgerEntry.create({
        data: {
          source: "COURT",
          amount: netPrice,
          method: data.paymentMethod,
          kind: "COLLECTED",
          refType: "BOOKING",
          refId: confirmed.id,
          createdAt: new Date(),
        },
      });

      return confirmed;
    });

    return { success: true, booking: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to confirm booking.",
    };
  }
}

/**
 * Creates and confirms a booking in one step (for front desk staff counter checkout).
 */
export async function bookAndConfirm(data: {
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  memberId?: string | null;
  guestName?: string | null;
  paymentMethod: "CASH" | "CARD" | "UPI" | "ONLINE";
}) {
  const created = await createBooking({
    courtId: data.courtId,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    memberId: data.memberId,
    guestName: data.guestName,
    kind: "NORMAL",
  });

  if (!created.success || !created.booking) {
    return created;
  }

  return await confirmBooking({
    bookingId: created.booking.id,
    paymentMethod: data.paymentMethod,
  });
}

/**
 * Join Friday Social Play session:
 * Enforces per-person capacity, row locks the booking, and counts toward daily limit.
 */
export async function joinSocialBooking(data: {
  bookingId: string;
  memberId: string;
  paymentMethod?: "CASH" | "CARD" | "UPI" | "ONLINE";
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Take row lock on the social booking
      const [booking] = await tx.$queryRaw<
        Array<{
          id: string;
          startsAt: Date;
          endsAt: Date;
          priceSnapshot: unknown;
          status: string;
          kind: string;
          courtId: string;
        }>
      >`SELECT id, "startsAt", "endsAt", "priceSnapshot", status, kind, "courtId" FROM "Booking" WHERE id = ${data.bookingId} FOR UPDATE`;

      if (!booking || booking.kind !== "SOCIAL" || booking.status !== "CONFIRMED") {
        throw new Error("Invalid or inactive social play session.");
      }

      const kolkataDateStr = formatKolkataDate(new Date(booking.startsAt));
      const { startUtc, endUtc } = getKolkataDayRange(kolkataDateStr);

      // Lock on memberId + local date
      const lockKey = `${data.memberId}:${kolkataDateStr}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      // 2. Re-check daily session limit
      const normalCount = await tx.booking.count({
        where: {
          memberId: data.memberId,
          startsAt: { gte: startUtc, lte: endUtc },
          status: { in: ["HELD", "CONFIRMED"] },
        },
      });

      const socialCount = await tx.bookingParticipant.count({
        where: {
          memberId: data.memberId,
          booking: {
            startsAt: { gte: startUtc, lte: endUtc },
            status: "CONFIRMED",
          },
        },
      });

      if (normalCount + socialCount >= CLUB_CONFIG.maxDailyBookingsPerMember) {
        throw new Error(
          `Daily booking limit reached. Members are permitted a maximum of ${CLUB_CONFIG.maxDailyBookingsPerMember} court sessions per day.`
        );
      }

      // 3. Check existing participation
      const existingPart = await tx.bookingParticipant.findFirst({
        where: {
          bookingId: data.bookingId,
          memberId: data.memberId,
        },
      });

      if (existingPart) {
        throw new Error("You have already joined this social session.");
      }

      // 4. Check court capacity
      const court = await tx.court.findUniqueOrThrow({
        where: { id: booking.courtId },
      });

      const currentCount = await tx.bookingParticipant.count({
        where: { bookingId: data.bookingId },
      });

      if (currentCount >= court.capacity) {
        throw new Error(`This social session is full (maximum ${court.capacity} players).`);
      }

      // 5. Add participant
      const participant = await tx.bookingParticipant.create({
        data: {
          bookingId: data.bookingId,
          memberId: data.memberId,
        },
      });

      // 6. Write COURT ledger entry
      const fee = Number(booking.priceSnapshot);
      if (fee > 0) {
        await tx.ledgerEntry.create({
          data: {
            source: "COURT",
            amount: fee,
            method: data.paymentMethod || "UPI",
            kind: "COLLECTED",
            refType: "SOCIAL_PLAY",
            refId: data.bookingId,
            createdAt: new Date(),
          },
        });
      }

      return participant;
    });

    return { success: true, participant: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to join social session.",
    };
  }
}

/**
 * Member Self-Cancellation:
 * Allowed only up to 24h prior to session start.
 */
export async function cancelBookingByMember(data: {
  bookingId: string;
  memberUserId: string;
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: data.bookingId },
        include: {
          member: true,
        },
      });

      // Verify ownership
      if (!booking.member || booking.member.userId !== data.memberUserId) {
        throw new Error("Unauthorized: You may only cancel your own bookings.");
      }

      if (booking.status === "CANCELLED") {
        throw new Error("This booking has already been cancelled.");
      }

      // Check 24h cutoff
      const now = Date.now();
      const startTime = new Date(booking.startsAt).getTime();
      const hoursUntilStart = (startTime - now) / (1000 * 60 * 60);

      if (hoursUntilStart < CLUB_CONFIG.selfCancelCutoffHours) {
        throw new Error(
          `Self-cancellation is only permitted at least 24 hours prior to session start (${hoursUntilStart.toFixed(
            1
          )}h remaining). Please contact club staff.`
        );
      }

      // Mark CANCELLED
      const cancelled = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" },
      });

      const netPrice = Math.max(
        0,
        Number(booking.priceSnapshot) - Number(booking.discountSnapshot)
      );

      // Refund in ledger if it was confirmed
      if (booking.status === "CONFIRMED" && netPrice > 0) {
        await tx.ledgerEntry.create({
          data: {
            source: "COURT",
            amount: netPrice,
            method: "ONLINE",
            kind: "REFUNDED",
            refType: "BOOKING",
            refId: booking.id,
            createdAt: new Date(),
          },
        });
      }

      return cancelled;
    });

    return { success: true, booking: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel booking.",
    };
  }
}

/**
 * Staff Cancellation:
 * Allowed at any time, requires mandatory cancellation reason, stored on booking record.
 */
export async function cancelBookingByStaff(data: {
  bookingId: string;
  staffUserId: string;
  reason: string;
}) {
  if (!data.reason || data.reason.trim().length < 3) {
    return {
      success: false,
      error: "A valid cancellation reason is required for staff cancellations.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: data.bookingId },
        include: { member: { include: { user: true } } },
      });

      if (booking.status === "CANCELLED") {
        throw new Error("This booking has already been cancelled.");
      }

      // Mark CANCELLED
      const cancelled = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" },
      });

      const netPrice = Math.max(
        0,
        Number(booking.priceSnapshot) - Number(booking.discountSnapshot)
      );

      // Record refund in ledger
      if (booking.status === "CONFIRMED" && netPrice > 0) {
        await tx.ledgerEntry.create({
          data: {
            source: "COURT",
            amount: netPrice,
            method: "CASH",
            kind: "REFUNDED",
            refType: "BOOKING",
            refId: booking.id,
            createdAt: new Date(),
          },
        });
      }

      // Store cancellation reason on the booking record
      await tx.booking.update({
        where: { id: booking.id },
        data: { cancelReason: data.reason.trim() },
      });

      return cancelled;
    });

    return { success: true, booking: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel booking.",
    };
  }
}

/**
 * Returns court availability matrix for a given local date (YYYY-MM-DD in Asia/Kolkata).
 */
export async function getCourtAvailability(dateStr: string) {
  // 1. Lazy cleanup
  await lazyCleanupExpiredHolds();

  const { startUtc, endUtc } = getKolkataDayRange(dateStr);
  const slots = generateDaySlots(dateStr);

  const [courts, pricingRules, bookings] = await Promise.all([
    prisma.court.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.pricingRule.findMany(),
    prisma.booking.findMany({
      where: {
        startsAt: { gte: startUtc, lte: endUtc },
        status: { in: ["HELD", "CONFIRMED"] },
      },
      include: {
        member: { include: { user: true } },
        participants: { include: { member: { include: { user: true } } } },
      },
    }),
  ]);

  // Build grid
  const courtColumns = courts.map((c) => {
    const rule = pricingRules.find((r) => r.sport === c.sport);
    return {
      id: c.id,
      name: c.name,
      sport: c.sport,
      capacity: c.capacity,
      basePrice: rule ? Number(rule.basePrice) : 1000,
    };
  });

  const now = new Date();

  // Create slot matrix
  const gridRows = slots.map((slot) => {
    const courtSlots = courtColumns.map((court) => {
      // Find overlapping booking for this court in this 60m window
      const match = bookings.find((b) => {
        if (b.courtId !== court.id) return false;
        const bStart = new Date(b.startsAt).getTime();
        const bEnd = new Date(b.endsAt).getTime();
        const sStart = slot.startsAt.getTime();
        const sEnd = slot.endsAt.getTime();
        // Overlap: bStart < sEnd && bEnd > sStart
        return bStart < sEnd && bEnd > sStart;
      });

      if (!match) {
        return {
          courtId: court.id,
          status: "FREE" as const,
          booking: null,
        };
      }

      if (match.status === "HELD") {
        const isExpired = match.holdExpiresAt && new Date(match.holdExpiresAt) < now;
        if (isExpired) {
          return {
            courtId: court.id,
            status: "FREE" as const,
            booking: null,
          };
        }
        return {
          courtId: court.id,
          status: "HELD" as const,
          booking: {
            id: match.id,
            status: match.status,
            startsAt: match.startsAt,
            endsAt: match.endsAt,
            holdExpiresAt: match.holdExpiresAt,
            guestName: match.guestName,
            memberName: match.member?.user?.name || (match.member ? `Member ${match.member.membershipNo}` : null),
          },
        };
      }

      if (match.kind === "SOCIAL") {
        return {
          courtId: court.id,
          status: "SOCIAL" as const,
          booking: {
            id: match.id,
            status: match.status,
            startsAt: match.startsAt,
            endsAt: match.endsAt,
            pricePerPerson: Number(match.priceSnapshot),
            capacity: court.capacity,
            participantCount: match.participants.length,
            participants: match.participants.map((p) => ({
              id: p.id,
              name: p.member?.user?.name || (p.member ? `Member ${p.member.membershipNo}` : p.guestName || "Guest"),
            })),
          },
        };
      }

      return {
        courtId: court.id,
        status: "CONFIRMED" as const,
        booking: {
          id: match.id,
          status: match.status,
          startsAt: match.startsAt,
          endsAt: match.endsAt,
          priceSnapshot: Number(match.priceSnapshot),
          discountSnapshot: Number(match.discountSnapshot),
          guestName: match.guestName,
          memberName: match.member?.user?.name || (match.member ? `Member ${match.member.membershipNo}` : null),
          membershipNo: match.member?.membershipNo || null,
        },
      };
    });

    return {
      slotKey: slot.slotKey,
      startTimeStr: slot.startTimeStr,
      endTimeStr: slot.endTimeStr,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      courts: courtSlots,
    };
  });

  return {
    date: dateStr,
    timezone: CLUB_CONFIG.timezone,
    operatingHours: {
      open: `${String(CLUB_CONFIG.openHour).padStart(2, "0")}:00`,
      close: `${String(CLUB_CONFIG.closeHour).padStart(2, "0")}:00`,
    },
    courts: courtColumns,
    rows: gridRows,
  };
}

/**
 * Creates a Friday Social Play event on a court.
 */
export async function createSocialEvent(data: {
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  pricePerPerson: number;
}) {
  return await prisma.booking.create({
    data: {
      courtId: data.courtId,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      kind: "SOCIAL",
      status: "CONFIRMED",
      priceSnapshot: data.pricePerPerson,
      discountSnapshot: 0,
    },
  });
}
