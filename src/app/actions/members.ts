"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createMemberService, renewMemberService } from "@/lib/services/members";
import { resolve } from "@/lib/services/entitlement";
import { getCurrentUser } from "@/lib/session";

export async function lookupMemberByIdAction(query: string): Promise<{
  success: boolean;
  member?: {
    id: string;
    name: string;
    membershipNo: string;
    planName: string;
    status: "ACTIVE" | "GRACE" | "EXPIRED" | "WALK_IN" | "PENDING_VERIFICATION";
    courtDiscountPct: number;
    shopDiscountPct: number;
    barDiscountPct: number;
    bookingsLeftToday: number;
    isJunior?: boolean;
    ageVerified?: boolean;
    ageVerifiedAt?: string | null;
    ageVerifiedByName?: string | null;
  };
  banned?: boolean;
  error?: string;
}> {
  try {
    const clean = query.trim().toUpperCase();
    if (!clean) {
      return { success: false, error: "Member ID required" };
    }

    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { membershipNo: { equals: clean, mode: "insensitive" } },
          { qrToken: { equals: clean, mode: "insensitive" } },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!member) {
      return { success: false, error: "No member found with this ID" };
    }

    if (member.user?.bannedAt) {
      return { success: false, error: "This account is banned", banned: true };
    }

    const ent = await resolve(member.id);

    let ageVerifiedByName: string | null = null;
    if (member.ageVerifiedById) {
      const staffUser = await prisma.user.findUnique({
        where: { id: member.ageVerifiedById },
        select: { name: true },
      });
      ageVerifiedByName = staffUser?.name || "Staff";
    }

    const isJunior = ent.plan?.name.toUpperCase().includes("JUNIOR") || false;

    return {
      success: true,
      member: {
        id: member.id,
        name: member.user?.name || `Member ${member.membershipNo}`,
        membershipNo: member.membershipNo,
        planName: ent.plan?.name || "No plan",
        status: ent.status,
        courtDiscountPct: ent.courtDiscountPct,
        shopDiscountPct: ent.shopDiscountPct,
        barDiscountPct: ent.barDiscountPct,
        bookingsLeftToday: ent.bookingsLeftToday,
        isJunior,
        ageVerified: Boolean(member.ageVerifiedAt),
        ageVerifiedAt: member.ageVerifiedAt ? member.ageVerifiedAt.toISOString() : null,
        ageVerifiedByName,
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify member ID",
    };
  }
}

export async function checkUserBanAction(email: string): Promise<{ banned: boolean }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { bannedAt: true },
    });
    return { banned: Boolean(user?.bannedAt) };
  } catch {
    return { banned: false };
  }
}

const banMemberSchema = z.object({
  memberId: z.string().min(1),
  reason: z.enum(["Misconduct", "Non-payment", "Fraud", "False age information", "Other"]),
  note: z.string().optional(),
  confirmId: z.string().min(1),
});

export async function banMemberAction(data: {
  memberId: string;
  reason: "Misconduct" | "Non-payment" | "Fraud" | "False age information" | "Other";
  note?: string;
  confirmId: string;
}) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== "OWNER" && currentUser.role !== "STAFF")) {
      return { success: false, error: "Only staff or owners can ban accounts." };
    }

    const parsed = banMemberSchema.parse(data);

    const targetMember = await prisma.member.findUnique({
      where: { id: parsed.memberId },
      include: { user: true },
    });

    if (!targetMember || !targetMember.user) {
      return { success: false, error: "Member account not found." };
    }

    if (targetMember.user.id === currentUser.id) {
      return { success: false, error: "You cannot ban your own account." };
    }

    if (targetMember.user.role === "OWNER" || targetMember.user.role === "STAFF") {
      return { success: false, error: "Only member accounts can be banned." };
    }

    if (
      targetMember.membershipNo.trim().toUpperCase() !==
      parsed.confirmId.trim().toUpperCase()
    ) {
      return {
        success: false,
        error: "Confirmation ID does not match the member's ID.",
      };
    }

    const now = new Date();
    const fullReason = parsed.note?.trim()
      ? `${parsed.reason}: ${parsed.note.trim()}`
      : parsed.reason;

    await prisma.$transaction(async (tx) => {
      // 1. Mark user as banned
      await tx.user.update({
        where: { id: targetMember.user!.id },
        data: {
          bannedAt: now,
          bannedById: currentUser.id,
          bannedReason: fullReason,
        },
      });

      // 2. Revoke all active sessions
      await tx.session.deleteMany({
        where: { userId: targetMember.user!.id },
      });

      // 3. Cancel upcoming court bookings
      await tx.booking.updateMany({
        where: {
          memberId: targetMember.id,
          startsAt: { gt: now },
          status: { in: ["HELD", "CONFIRMED"] },
        },
        data: {
          status: "CANCELLED",
          cancelReason: "Account banned",
        },
      });
    });

    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${parsed.memberId}`);
    revalidatePath("/admin/courts");

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to ban member.",
    };
  }
}

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


function calculateAge(dobStr: string): number | null {
  if (!dobStr) return null;
  const parts = dobStr.split("-");
  if (parts.length !== 3) return null;
  const birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const signUpSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z.string().min(8, "Valid phone number required"),
  email: z.string().email("Valid email required"),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required")
    .refine((val) => {
      const parts = val.split("-");
      if (parts.length !== 3) return false;
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return !isNaN(d.getTime()) && d <= new Date();
    }, { message: "Date of birth cannot be in the future" })
    .refine((val) => {
      const age = calculateAge(val);
      return age !== null && age >= 5;
    }, { message: "Must be at least 5 years old to join" })
    .refine((val) => {
      const age = calculateAge(val);
      return age !== null && age <= 100;
    }, { message: "Age cannot exceed 100 years" }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signUpMemberAction(formData: FormData) {
  try {
    const raw = {
      name: formData.get("name") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      dateOfBirth: formData.get("dateOfBirth") as string,
      password: formData.get("password") as string,
    };

    const validation = signUpSchema.safeParse(raw);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "Invalid input provided";
      return { success: false, error: firstError };
    }
    const parsed = validation.data;

    const existing = await prisma.user.findUnique({
      where: { email: parsed.email },
    });
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    // Reject phone numbers belonging to banned members
    const bannedAddress = await prisma.memberAddress.findFirst({
      where: {
        phone: parsed.phone.trim(),
        member: { user: { bannedAt: { not: null } } },
      },
    });
    if (bannedAddress) {
      return { success: false, error: "This phone number is associated with an account that cannot register." };
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

    // 2. Strict Role Enforcement & Member creation in a single transaction
    const memberCount = await prisma.member.count();
    const membershipNo = `CC-2026-${String(memberCount + 1).padStart(3, "0")}`;
    const qrToken = `QR-CC-${String(memberCount + 1).padStart(3, "0")}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: authResult.user.id },
          data: { role: "MEMBER" },
        });

        await tx.member.create({
          data: {
            userId: authResult.user.id,
            membershipNo,
            qrToken,
            dateOfBirth: new Date(parsed.dateOfBirth),
          },
        });
      });
    } catch (txErr) {
      // Rollback auth user creation if Member creation failed
      await prisma.user.delete({ where: { id: authResult.user.id } }).catch(() => {});
      throw txErr;
    }

    revalidatePath("/admin/members");
    revalidatePath("/admin");

    return { success: true, email: parsed.email, password: parsed.password };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      const zErr = error as z.ZodError;
      return { success: false, error: zErr.issues[0]?.message || "Validation failed" };
    }
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

export async function updateMemberDobAction(data: {
  memberId: string;
  dateOfBirth: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Only staff and owners can change date of birth." };
    }

    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
      include: { user: true },
    });

    if (!member) {
      return { success: false, error: "Member not found." };
    }

    const oldDobStr = member.dateOfBirth ? member.dateOfBirth.toISOString().split("T")[0] : "Not set";
    const newDob = new Date(data.dateOfBirth);
    const newDobStr = newDob.toISOString().split("T")[0];

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: member.id },
        data: { dateOfBirth: newDob },
      });

      await tx.memberAuditLog.create({
        data: {
          memberId: member.id,
          field: "dateOfBirth",
          oldValue: oldDobStr,
          newValue: newDobStr,
          changedBy: `${user.name} (${user.role})`,
        },
      });
    });

    revalidatePath(`/admin/members/${member.id}`);
    revalidatePath("/admin/members");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update date of birth.",
    };
  }
}

export async function verifyMemberAgeAction(data: {
  memberId: string;
  ageDocType: "SCHOOL_ID" | "AADHAAR" | "BIRTH_CERTIFICATE" | "OTHER";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Only staff and owners can verify member age." };
    }

    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
    });

    if (!member) {
      return { success: false, error: "Member not found." };
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: member.id },
        data: {
          ageVerifiedAt: now,
          ageVerifiedById: user.id,
          ageDocType: data.ageDocType,
        },
      });

      await tx.memberAuditLog.create({
        data: {
          memberId: member.id,
          field: "ageVerified",
          oldValue: "Unverified",
          newValue: `Verified via ${data.ageDocType}`,
          changedBy: `${user.name} (${user.role})`,
        },
      });
    });

    revalidatePath(`/admin/members/${member.id}`);
    revalidatePath("/admin/members");
    revalidatePath("/member/plan");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify age.",
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
