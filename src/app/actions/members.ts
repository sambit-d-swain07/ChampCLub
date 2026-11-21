"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createMemberService, renewMemberService } from "@/lib/services/members";

type PaymentMethod = "CASH" | "CARD" | "UPI" | "ONLINE";

const registerMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  planId: z.string().min(1, "Plan selection required"),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "ONLINE"] as const),
});

const renewMemberSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().min(1),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "ONLINE"] as const),
});

export async function registerMemberAction(formData: FormData) {
  try {
    const raw = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      planId: formData.get("planId") as string,
      paymentMethod: (formData.get("paymentMethod") as PaymentMethod) || "UPI",
    };

    const parsed = registerMemberSchema.parse(raw);
    const member = await createMemberService(parsed);

    revalidatePath("/admin/members");
    revalidatePath("/admin");

    return { success: true, memberId: member.id };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to register member." };
  }
}

export async function renewMemberAction(formData: FormData) {
  try {
    const raw = {
      memberId: formData.get("memberId") as string,
      planId: formData.get("planId") as string,
      paymentMethod: (formData.get("paymentMethod") as PaymentMethod) || "UPI",
    };

    const parsed = renewMemberSchema.parse(raw);
    await renewMemberService(parsed);

    revalidatePath(`/admin/members/${parsed.memberId}`);
    revalidatePath("/admin/members");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to renew membership." };
  }
}

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  planId: z.string().min(1, "Please select a membership plan"),
});

export async function signUpMemberAction(formData: FormData) {
  try {
    const raw = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      planId: formData.get("planId") as string,
    };

    const parsed = signUpSchema.parse(raw);

    const existing = await prisma.user.findUnique({
      where: { email: parsed.email },
    });
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    // 1. Create User via Better Auth API
    const authResult = await auth.api.signUpEmail({
      body: {
        name: parsed.name,
        email: parsed.email,
        password: parsed.password,
      },
    });

    // 2. Strict Role Enforcement: ALWAYS MEMBER
    await prisma.user.update({
      where: { id: authResult.user.id },
      data: { role: "MEMBER" },
    });

    // 3. Create Member entity & Membership
    const plan = await prisma.plan.findUniqueOrThrow({
      where: { id: parsed.planId },
    });

    const memberCount = await prisma.member.count();
    const membershipNo = `CC-2026-${String(memberCount + 1).padStart(3, "0")}`;
    const qrToken = `QR-CC-${String(memberCount + 1).padStart(3, "0")}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const member = await prisma.member.create({
      data: {
        userId: authResult.user.id,
        membershipNo,
        qrToken,
        memberships: {
          create: {
            planId: plan.id,
            startsAt,
            endsAt,
            pricePaid: plan.price,
          },
        },
      },
      include: {
        memberships: true,
      },
    });

    // 4. Ledger Entry
    await prisma.ledgerEntry.create({
      data: {
        source: "MEMBERSHIP",
        amount: plan.price,
        method: "ONLINE",
        kind: "COLLECTED",
        refType: "MEMBERSHIP",
        refId: member.memberships[0].id,
        createdAt: startsAt,
      },
    });

    revalidatePath("/admin/members");
    revalidatePath("/admin");

    return { success: true, email: parsed.email };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete sign-up.",
    };
  }
}
