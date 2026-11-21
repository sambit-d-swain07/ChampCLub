"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createMemberService, renewMemberService } from "@/lib/services/members";

export async function getPostLoginRedirectAction(
  email: string,
  requestedRedirect?: string | null
): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { role: true },
    });

    if (user?.role === "OWNER") {
      return "/admin/owner";
    }
    if (user?.role === "STAFF") {
      return "/admin/members";
    }
    if (requestedRedirect && requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("/login")) {
      return requestedRedirect;
    }
    return "/member";
  } catch {
    return "/member";
  }
}

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

// Credit mode: "PAID_AMOUNT" uses full pricePaid; "PRORATA" uses pro-rated remainder
const PLAN_CHANGE_CREDIT_MODE: "PAID_AMOUNT" | "PRORATA" = "PAID_AMOUNT";

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
    const newPrice = Number(plan.price);

    // Validate Junior plan age restriction SERVER-SIDE
    if (plan.name.toUpperCase().includes("JUNIOR")) {
      // Check DB dob first, fall back to submitted dob
      const memberDob = member.dateOfBirth;
      const dobToUse = memberDob ?? (parsed.dob ? new Date(parsed.dob) : null);
      if (!dobToUse) {
        return { success: false, error: "Date of birth is required for the Junior plan." };
      }
      const diffMs = Date.now() - dobToUse.getTime();
      const calculatedAge = Math.abs(new Date(diffMs).getUTCFullYear() - 1970);
      if (calculatedAge >= 18) {
        return { success: false, error: "Junior plan is exclusively reserved for members under 18 years of age." };
      }
      // Save DOB on member if it was supplied
      if (!memberDob && parsed.dob) {
        await prisma.member.update({
          where: { id: member.id },
          data: { dateOfBirth: new Date(parsed.dob) },
        });
      }
    }

    const now = new Date();

    // Find current active non-replaced membership
    const currentMembership = await prisma.membership.findFirst({
      where: {
        memberId: member.id,
        replacedAt: null,
        endsAt: { gte: now },
      },
      include: { plan: true },
      orderBy: { startsAt: "desc" },
    });

    // ---- Case 1: Same plan + ACTIVE → reject ----
    if (currentMembership && currentMembership.planId === plan.id) {
      return { success: false, error: "You are already on this plan. Renewing is only possible after expiry or in grace." };
    }

    // ---- Case 2: No current membership → fresh activation ----
    if (!currentMembership) {
      const startsAt = now;
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
      return { success: true };
    }

    const currentPlan = currentMembership.plan;
    const currentPrice = Number(currentPlan.price);
    const pricePaid = Number(currentMembership.pricePaid);

    // ---- Case 3: Upgrade (new price > current price) ----
    if (newPrice > currentPrice) {
      let credit: number;
      if (PLAN_CHANGE_CREDIT_MODE === "PRORATA") {
        const totalMs = currentMembership.endsAt.getTime() - currentMembership.startsAt.getTime();
        const remainMs = Math.max(0, currentMembership.endsAt.getTime() - now.getTime());
        credit = totalMs > 0 ? pricePaid * (remainMs / totalMs) : 0;
        credit = Math.round(credit);
      } else {
        credit = pricePaid;
      }
      const amountDue = Math.max(0, newPrice - credit);

      const startsAt = now;
      const endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

      await prisma.$transaction(async (tx) => {
        // Mark old membership as replaced
        await tx.membership.update({
          where: { id: currentMembership.id },
          data: { replacedAt: now },
        });
        // Create new membership
        const newMembership = await tx.membership.create({
          data: {
            memberId: member.id,
            planId: plan.id,
            startsAt,
            endsAt,
            pricePaid: amountDue,
          },
        });
        // Write ledger only for the amount actually due
        if (amountDue > 0) {
          await tx.ledgerEntry.create({
            data: {
              source: "MEMBERSHIP",
              amount: amountDue,
              method: "ONLINE",
              kind: "EARNED",
              refType: "MEMBERSHIP",
              refId: newMembership.id,
              createdAt: now,
            },
          });
          await tx.ledgerEntry.create({
            data: {
              source: "MEMBERSHIP",
              amount: amountDue,
              method: "ONLINE",
              kind: "COLLECTED",
              refType: "MEMBERSHIP",
              refId: newMembership.id,
              createdAt: now,
            },
          });
        }
      });

      revalidatePath("/member");
      revalidatePath("/member/plan");
      revalidatePath("/member/choose-plan");
      revalidatePath("/admin/members");
      return { success: true, upgraded: true, amountDue, credit };
    }

    // ---- Case 4: Downgrade (new price < current price) ----
    // Save nextPlanId — member keeps current plan until it expires
    await prisma.membership.update({
      where: { id: currentMembership.id },
      data: { nextPlanId: plan.id },
    });

    revalidatePath("/member");
    revalidatePath("/member/plan");
    revalidatePath("/member/choose-plan");
    return {
      success: true,
      scheduled: true,
      startsOn: currentMembership.endsAt.toISOString(),
      planName: plan.name,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to activate plan.",
    };
  }
}

export async function cancelPlanChangeAction(): Promise<void> {
  "use server";
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const member = await prisma.member.findUnique({ where: { userId: user.id } });
    if (!member) return;

    const now = new Date();
    const activeMembership = await prisma.membership.findFirst({
      where: { memberId: member.id, replacedAt: null, endsAt: { gte: now } },
      orderBy: { startsAt: "desc" },
    });
    if (!activeMembership) return;

    await prisma.membership.update({
      where: { id: activeMembership.id },
      data: { nextPlanId: null },
    });

    revalidatePath("/member/plan");
  } catch {
    // silently fail — user will see no change and can retry
  }
}
