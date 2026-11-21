"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const addCourtSchema = z.object({
  name: z.string().min(1, "Court name is required").max(50),
  sport: z.enum(["TENNIS", "PADEL", "BADMINTON"] as const),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(10, "Capacity cannot exceed 10"),
});

const editCourtSchema = z.object({
  courtId: z.string().min(1, "Court ID is required"),
  name: z.string().min(1, "Court name is required").max(50),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(10, "Capacity cannot exceed 10"),
});

export async function addCourtAction(data: {
  name: string;
  sport: "TENNIS" | "PADEL" | "BADMINTON";
  capacity: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "OWNER") {
      return { success: false, error: "Only the club owner can add courts." };
    }

    const parsed = addCourtSchema.parse(data);

    // Check unique name within sport (case-insensitive) among active courts
    const existing = await prisma.court.findFirst({
      where: {
        sport: parsed.sport,
        name: { equals: parsed.name.trim(), mode: "insensitive" },
        archivedAt: null,
      },
    });

    if (existing) {
      return { success: false, error: `A ${parsed.sport.toLowerCase()} court named "${parsed.name}" already exists.` };
    }

    const newCourt = await prisma.court.create({
      data: {
        name: parsed.name.trim(),
        sport: parsed.sport,
        capacity: parsed.capacity,
      },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/");
    revalidatePath("/member/book");
    revalidatePath("/api/courts/availability");

    return { success: true, court: newCourt };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add court.",
    };
  }
}

export async function editCourtAction(data: {
  courtId: string;
  name: string;
  capacity: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "OWNER") {
      return { success: false, error: "Only the club owner can edit courts." };
    }

    const parsed = editCourtSchema.parse(data);

    const court = await prisma.court.findUnique({
      where: { id: parsed.courtId },
    });

    if (!court || court.archivedAt) {
      return { success: false, error: "Court not found or already archived." };
    }

    // Check unique name in sport (case-insensitive, ignoring self)
    const existing = await prisma.court.findFirst({
      where: {
        sport: court.sport,
        name: { equals: parsed.name.trim(), mode: "insensitive" },
        id: { not: parsed.courtId },
        archivedAt: null,
      },
    });

    if (existing) {
      return { success: false, error: `Another ${court.sport.toLowerCase()} court named "${parsed.name}" already exists.` };
    }

    const updated = await prisma.court.update({
      where: { id: parsed.courtId },
      data: {
        name: parsed.name.trim(),
        capacity: parsed.capacity,
      },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/");
    revalidatePath("/member/book");
    revalidatePath("/api/courts/availability");

    return { success: true, court: updated };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update court.",
    };
  }
}

export async function checkCourtFutureBookingsAction(courtId: string) {
  try {
    const count = await prisma.booking.count({
      where: {
        courtId,
        startsAt: { gte: new Date() },
        status: { in: ["CONFIRMED", "HELD"] },
      },
    });
    return { success: true, futureCount: count };
  } catch (err: unknown) {
    return { success: false, futureCount: 0 };
  }
}

export async function deleteCourtAction(courtId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "OWNER") {
      return { success: false, error: "Only the club owner can delete courts." };
    }

    const now = new Date();

    await prisma.$transaction(
      async (tx) => {
        // 1. Find all future CONFIRMED or HELD bookings
        const futureBookings = await tx.booking.findMany({
          where: {
            courtId,
            startsAt: { gte: now },
            status: { in: ["CONFIRMED", "HELD"] },
          },
        });

        // 2. Cancel future bookings with reason "Court removed"
        if (futureBookings.length > 0) {
          await tx.booking.updateMany({
            where: {
              courtId,
              startsAt: { gte: now },
              status: { in: ["CONFIRMED", "HELD"] },
            },
            data: {
              status: "CANCELLED",
              cancelReason: "Court removed",
            },
          });

          // 3. Write REFUNDED ledger entries for any paid confirmed bookings
          for (const b of futureBookings) {
            if (b.status === "CONFIRMED") {
              const paidAmount = Math.max(0, Number(b.priceSnapshot) - Number(b.discountSnapshot));
              if (paidAmount > 0) {
                await tx.ledgerEntry.create({
                  data: {
                    source: "COURT",
                    amount: paidAmount,
                    method: "UPI",
                    kind: "REFUNDED",
                    refType: "BOOKING",
                    refId: b.id,
                    createdAt: new Date(),
                  },
                });
              }
            }
          }
        }

        // 4. Soft-delete court by setting archivedAt
        await tx.court.update({
          where: { id: courtId },
          data: { archivedAt: new Date() },
        });
      },
      {
        maxWait: 10000,
        timeout: 20000,
      }
    );

    revalidatePath("/admin/courts");
    revalidatePath("/");
    revalidatePath("/member/book");
    revalidatePath("/api/courts/availability");

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete court.",
    };
  }
}
