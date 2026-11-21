"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import {
  createBooking,
  confirmBooking,
  bookAndConfirm,
  joinSocialBooking,
  cancelBookingByMember,
  cancelBookingByStaff,
  createSocialEvent,
} from "@/lib/services/booking";
import { prisma } from "@/lib/prisma";

const createBookingSchema = z.object({
  courtId: z.string().min(1, "Court is required"),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  memberId: z.string().optional().nullable(),
  guestName: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "ONLINE"] as const).optional(),
});

export async function createBookingAction(formData: FormData) {
  try {
    const raw = {
      courtId: formData.get("courtId") as string,
      startsAt: formData.get("startsAt") as string,
      endsAt: formData.get("endsAt") as string,
      memberId: (formData.get("memberId") as string) || null,
      guestName: (formData.get("guestName") as string) || null,
    };

    const parsed = createBookingSchema.parse(raw);

    if (parsed.memberId) {
      const targetMember = await prisma.member.findUnique({
        where: { id: parsed.memberId },
        include: { user: true },
      });
      if (targetMember?.user?.bannedAt) {
        return { success: false, error: "This account is banned and cannot book courts." };
      }
    }

    const result = await createBooking({
      courtId: parsed.courtId,
      startsAt: new Date(parsed.startsAt),
      endsAt: new Date(parsed.endsAt),
      memberId: parsed.memberId,
      guestName: parsed.guestName,
    });

    if (result.success && result.booking) {
      revalidatePath("/admin/courts");
      revalidatePath("/member/bookings");
      revalidatePath("/api/courts/availability");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create booking",
    };
  }
}

export async function confirmBookingAction(formData: FormData) {
  try {
    const bookingId = formData.get("bookingId") as string;
    const paymentMethod = (formData.get("paymentMethod") as "CASH" | "CARD" | "UPI" | "ONLINE") || "UPI";

    const result = await confirmBooking({
      bookingId,
      paymentMethod,
    });

    if (result.success) {
      revalidatePath("/admin/courts");
      revalidatePath("/member/bookings");
      revalidatePath("/api/courts/availability");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to confirm booking",
    };
  }
}

export async function bookAndConfirmAction(formData: FormData) {
  try {
    const raw = {
      courtId: formData.get("courtId") as string,
      startsAt: formData.get("startsAt") as string,
      endsAt: formData.get("endsAt") as string,
      memberId: (formData.get("memberId") as string) || null,
      guestName: (formData.get("guestName") as string) || null,
      paymentMethod: (formData.get("paymentMethod") as "CASH" | "CARD" | "UPI" | "ONLINE") || "UPI",
    };

    const parsed = createBookingSchema.parse(raw);

    if (parsed.memberId) {
      const targetMember = await prisma.member.findUnique({
        where: { id: parsed.memberId },
        include: { user: true },
      });
      if (targetMember?.user?.bannedAt) {
        return { success: false, error: "This account is banned and cannot book courts." };
      }
    }

    const result = await bookAndConfirm({
      courtId: parsed.courtId,
      startsAt: new Date(parsed.startsAt),
      endsAt: new Date(parsed.endsAt),
      memberId: parsed.memberId,
      guestName: parsed.guestName,
      paymentMethod: raw.paymentMethod,
    });

    if (result.success) {
      revalidatePath("/admin/courts");
      revalidatePath("/member/bookings");
      revalidatePath("/api/courts/availability");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete court booking",
    };
  }
}

export async function bookMemberCourtAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to book a court." };
    }

    const member = await prisma.member.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    if (!member) {
      return { success: false, error: "Member profile not found." };
    }

    if (member.user?.bannedAt) {
      return { success: false, error: "This account has been banned. Booking courts is not permitted." };
    }

    const courtId = formData.get("courtId") as string;
    const startsAt = formData.get("startsAt") as string;
    const endsAt = formData.get("endsAt") as string;
    const paymentMethod = (formData.get("paymentMethod") as "CASH" | "CARD" | "UPI" | "ONLINE") || "ONLINE";

    // Strictly enforce memberId from the authenticated session
    const result = await bookAndConfirm({
      courtId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      memberId: member.id,
      paymentMethod,
    });

    if (result.success) {
      revalidatePath("/admin/courts");
      revalidatePath("/member/bookings");
      revalidatePath("/member/book");
      revalidatePath("/member");
      revalidatePath("/api/courts/availability");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to book court.",
    };
  }
}

export async function joinSocialAction(bookingId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required to join social sessions." };
    }

    const member = await prisma.member.findUnique({
      where: { userId: user.id },
    });

    if (!member) {
      return { success: false, error: "Only registered club members may join social play." };
    }

    const result = await joinSocialBooking({
      bookingId,
      memberId: member.id,
      paymentMethod: "ONLINE",
    });

    if (result.success) {
      revalidatePath("/admin/courts");
      revalidatePath("/member/bookings");
      revalidatePath("/api/courts/availability");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to join social session.",
    };
  }
}

export async function cancelMemberBookingAction(bookingId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required." };
    }

    const result = await cancelBookingByMember({
      bookingId,
      memberUserId: user.id,
    });

    if (result.success) {
      revalidatePath("/admin/courts");
      revalidatePath("/member/bookings");
      revalidatePath("/api/courts/availability");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel booking",
    };
  }
}

export async function cancelStaffBookingAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Staff authentication required." };
    }

    const role = (user as { role?: string })?.role;
    if (role !== "STAFF" && role !== "OWNER") {
      return { success: false, error: "Unauthorized: Staff permission required." };
    }

    const bookingId = formData.get("bookingId") as string;
    const reason = formData.get("reason") as string;

    const result = await cancelBookingByStaff({
      bookingId,
      staffUserId: user.id,
      reason,
    });

    if (result.success) {
      revalidatePath("/admin/courts");
      revalidatePath("/member/bookings");
      revalidatePath("/api/courts/availability");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel booking",
    };
  }
}

export async function createSocialEventAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Authentication required." };

    const courtId = formData.get("courtId") as string;
    const startsAt = new Date(formData.get("startsAt") as string);
    const endsAt = new Date(formData.get("endsAt") as string);
    const pricePerPerson = Number(formData.get("pricePerPerson") || 350);

    const booking = await createSocialEvent({
      courtId,
      startsAt,
      endsAt,
      pricePerPerson,
    });

    revalidatePath("/admin/courts");
    revalidatePath("/api/courts/availability");

    return { success: true, bookingId: booking.id };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create social event",
    };
  }
}
