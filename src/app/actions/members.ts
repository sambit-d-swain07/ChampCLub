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

import { getCurrentUser } from "@/lib/session";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(8, "Valid phone number required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signUpMemberAction(formData: FormData) {
  try {
    const raw = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
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

    if (!authResult?.user?.id) {
      return { success: false, error: "Unable to create member credentials." };
    }

    // 2. Strict Role Enforcement: ALWAYS MEMBER on server
    await prisma.user.update({
      where: { id: authResult.user.id },
      data: { role: "MEMBER" },
    });

    // 3. Create Member entity with unique membershipNo & qrToken (NO membership plan yet)
    const memberCount = await prisma.member.count();
    const membershipNo = `CC-2026-${String(memberCount + 1).padStart(3, "0")}`;
    const qrToken = `QR-CC-${String(memberCount + 1).padStart(3, "0")}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    await prisma.member.create({
      data: {
        userId: authResult.user.id,
        membershipNo,
        qrToken,
      },
    });

    revalidatePath("/admin/members");
    revalidatePath("/admin");

    return { success: true, email: parsed.email, password: parsed.password };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete sign-up.",
    };
  }
}

const choosePlanSchema = z.object({
  planId: z.string().min(1, "Plan selection required"),
  dob: z.string().optional(),
});

export async function choosePlanAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Please log in to choose a membership plan." };
    }

    const member = await prisma.member.findUnique({
      where: { userId: user.id },
    });
    if (!member) {
      return { success: false, error: "Member profile not found." };
    }

    const raw = {
      planId: formData.get("planId") as string,
      dob: (formData.get("dob") as string) || undefined,
    };
    const parsed = choosePlanSchema.parse(raw);

    const plan = await prisma.plan.findUniqueOrThrow({
      where: { id: parsed.planId },
    });

    // Validate Junior plan age restriction (< 18)
    if (plan.name.toUpperCase().includes("JUNIOR")) {
      if (!parsed.dob) {
        return { success: false, error: "Date of birth is required for the Junior plan." };
      }
      const birthDate = new Date(parsed.dob);
      const diffMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(diffMs);
      const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (calculatedAge >= 18) {
        return { success: false, error: "Junior plan is exclusively reserved for members under 18 years of age." };
      }
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const membership = await prisma.membership.create({
      data: {
        memberId: member.id,
        planId: plan.id,
        startsAt,
        endsAt,
        pricePaid: plan.price,
      },
    });

    // Write MEMBERSHIP ledger entry (Demo checkout recorded as method ONLINE)
    await prisma.ledgerEntry.create({
      data: {
        source: "MEMBERSHIP",
        amount: plan.price,
        method: "ONLINE",
        kind: "COLLECTED",
        refType: "MEMBERSHIP",
        refId: membership.id,
        createdAt: startsAt,
      },
    });

    revalidatePath("/member");
    revalidatePath("/member/plan");
    revalidatePath("/member/choose-plan");
    revalidatePath("/admin/members");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to activate plan.",
    };
  }
}
