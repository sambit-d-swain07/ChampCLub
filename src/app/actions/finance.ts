"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { generateShareToken } from "@/lib/services/finance";
import { revalidatePath } from "next/cache";

async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const role = (user as { role?: string }).role || "MEMBER";
  if (role !== "OWNER") throw new Error("Forbidden: Owner access only");
  return user;
}

export async function createExpenseAction(data: {
  category: string;
  vendor: string;
  amount: number;
  paid: boolean;
  date?: string;
  notes?: string;
}) {
  const user = await requireOwner();

  if (!data.vendor || !data.amount || data.amount <= 0) {
    return { success: false, error: "Vendor and a positive amount are required." };
  }

  const expenseDate = data.date ? new Date(data.date) : new Date();

  const notesPayload = JSON.stringify({
    vendor: data.vendor.trim(),
    paid: Boolean(data.paid),
    notes: data.notes?.trim() || "",
  });

  const expense = await prisma.expense.create({
    data: {
      title: `${data.vendor.trim()} - ${data.category}`,
      category: data.category,
      amount: data.amount,
      date: expenseDate,
      recordedBy: user.name || "Owner",
      notes: notesPayload,
    },
  });

  revalidatePath("/admin/owner");
  revalidatePath("/admin/expenses");
  return { success: true, expenseId: expense.id };
}

export async function toggleExpensePaidAction(expenseId: string, markPaid: boolean) {
  await requireOwner();

  const expense = await prisma.expense.findUniqueOrThrow({ where: { id: expenseId } });
  let vendor = expense.title;
  let notesText = "";

  try {
    if (expense.notes) {
      const parsed = JSON.parse(expense.notes);
      if (parsed.vendor) vendor = parsed.vendor;
      if (parsed.notes) notesText = parsed.notes;
    }
  } catch {
    notesText = expense.notes || "";
  }

  const updatedNotes = JSON.stringify({
    vendor,
    paid: markPaid,
    notes: notesText,
  });

  await prisma.expense.update({
    where: { id: expenseId },
    data: { notes: updatedNotes },
  });

  revalidatePath("/admin/owner");
  revalidatePath("/admin/expenses");
  return { success: true };
}

export async function createShareLinkAction(filter: { range: string; from?: string; to?: string }) {
  await requireOwner();
  const token = generateShareToken(filter, 48); // 48-hour valid link
  return { success: true, token, shareUrl: `/share/summary?token=${token}` };
}
