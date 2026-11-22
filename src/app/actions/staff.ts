"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const createStaffSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").max(70),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function createStaffAction(data: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "OWNER") {
      return { success: false, error: "Only the club owner can add new staff." };
    }

    const parsed = createStaffSchema.parse(data);

    // 1. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email },
    });

    if (existingUser) {
      return { success: false, error: "A user with this email address already exists." };
    }

    // 2. Create User via Better Auth API
    const authResult = await auth.api.signUpEmail({
      body: {
        name: parsed.name,
        email: parsed.email,
        password: parsed.password,
      },
    });

    if (!authResult?.user?.id) {
      return { success: false, error: "Failed to create staff credentials." };
    }

    // 3. Promote role to STAFF and verify email
    const staffUser = await prisma.user.update({
      where: { id: authResult.user.id },
      data: {
        role: "STAFF",
        emailVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bannedAt: true,
        createdAt: true,
      },
    });

    revalidatePath("/admin/staff");
    revalidatePath("/admin/owner");
    revalidatePath("/admin");

    return {
      success: true,
      staff: staffUser,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create staff member.",
    };
  }
}

export async function toggleStaffStatusAction(staffId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "OWNER") {
      return { success: false, error: "Only the club owner can update staff status." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: staffId },
    });

    if (!targetUser) {
      return { success: false, error: "Staff member not found." };
    }

    if (targetUser.role !== "STAFF") {
      return { success: false, error: "Target account is not a staff member." };
    }

    const isBanned = !!targetUser.bannedAt;

    if (isBanned) {
      // Reactivate
      await prisma.user.update({
        where: { id: staffId },
        data: {
          bannedAt: null,
          bannedById: null,
          bannedReason: null,
        },
      });
    } else {
      // Deactivate / Ban
      await prisma.user.update({
        where: { id: staffId },
        data: {
          bannedAt: new Date(),
          bannedById: currentUser.id,
          bannedReason: "Deactivated by owner",
        },
      });
      // Invalidate existing sessions
      await prisma.session.deleteMany({
        where: { userId: staffId },
      }).catch(() => {});
    }

    revalidatePath("/admin/staff");
    revalidatePath("/admin/owner");
    revalidatePath("/admin");

    return { success: true, active: isBanned };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update staff status.",
    };
  }
}
