"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function requireStaffOrOwner() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const role = (user as { role?: string }).role || "MEMBER";
  if (role !== "OWNER" && role !== "STAFF") throw new Error("Forbidden");
  return user;
}

export async function updateLeadStatusAction(leadId: string, status: string) {
  await requireStaffOrOwner();
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: status as never },
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true };
}

export async function assignLeadAction(leadId: string, staffUserId: string) {
  await requireStaffOrOwner();
  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedTo: staffUserId },
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true };
}

export async function setLeadFollowUpAction(leadId: string, followUpAt: string) {
  await requireStaffOrOwner();
  await prisma.lead.update({
    where: { id: leadId },
    data: { followUpAt: new Date(followUpAt) },
  });
  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true };
}

export async function addLeadNoteAction(leadId: string, note: string) {
  await requireStaffOrOwner();
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const existing = lead.notes || "";
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const appended = existing
    ? `${existing}\n\n[${timestamp}] ${note}`
    : `[${timestamp}] ${note}`;
  await prisma.lead.update({
    where: { id: leadId },
    data: { notes: appended },
  });
  revalidatePath(`/admin/leads/${leadId}`);
  return { success: true };
}

export async function convertLeadToMemberAction(
  leadId: string,
  planId: string,
  startsAt: string
) {
  await requireStaffOrOwner();

  // 1. Find lead
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });

  // 2. Find plan (for durationDays & price)
  const plan = await prisma.plan.findUniqueOrThrow({ where: { id: planId } });

  // 3. Create Member (unique membershipNo & qrToken using count)
  const memberCount = await prisma.member.count();
  const membershipNo = `CC-2026-${String(memberCount + 1).padStart(3, "0")}`;
  const qrToken = `QR-CC-${String(memberCount + 1).padStart(3, "0")}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  const member = await prisma.member.create({
    data: { membershipNo, qrToken },
  });

  // 4. Create Membership (startsAt, endsAt = startsAt + durationDays, pricePaid = plan.price)
  const start = new Date(startsAt);
  const end = new Date(start);
  end.setDate(end.getDate() + plan.durationDays);

  await prisma.membership.create({
    data: {
      memberId: member.id,
      planId: plan.id,
      startsAt: start,
      endsAt: end,
      pricePaid: plan.price,
    },
  });

  // 5. Update lead status to CONVERTED
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "CONVERTED" },
  });

  // 6. If trialBookingId, link booking to new member
  if (lead.trialBookingId) {
    await prisma.booking.update({
      where: { id: lead.trialBookingId },
      data: { memberId: member.id },
    });
  }

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/members");

  return { success: true as const, memberId: member.id };
}
