"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BarOrderStatus, PaymentMethod } from "@prisma/client";
import {
  openTab,
  addOrderToTab,
  updateBarOrderStatus,
  payTab,
  getKitchenOrders,
  getShiftCloseReport,
  SplitPaymentInput,
} from "@/lib/services/bar";

const openTabSchema = z.object({
  tableId: z.string().optional().nullable(),
  memberId: z.string().optional().nullable(),
  guestName: z.string().optional().nullable(),
});

export async function openTabAction(data: {
  tableId?: string | null;
  memberId?: string | null;
  guestName?: string | null;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Staff authentication required to open a tab." };
    }

    const parsed = openTabSchema.parse(data);

    if (parsed.memberId) {
      const targetMember = await prisma.member.findUnique({
        where: { id: parsed.memberId },
        include: { user: true },
      });
      if (targetMember?.user?.bannedAt) {
        return { success: false, error: "This member account is banned." };
      }
    }

    const result = await openTab({
      ...parsed,
      staffUserId: user.id,
    });

    if (result.success) {
      revalidatePath("/admin/bar");
      revalidatePath("/kitchen");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to open bar tab.",
    };
  }
}

export async function freeTableAction(data: { tableId: string; tabId?: string }) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Staff authentication required to free a table." };
    }

    const tab = data.tabId
      ? await prisma.tab.findUnique({
          where: { id: data.tabId },
          include: { orders: { include: { items: true } } },
        })
      : await prisma.tab.findFirst({
          where: { tableId: data.tableId, status: "OPEN" },
          include: { orders: { include: { items: true } } },
        });

    if (tab) {
      // Check outstanding balance
      const totalAmount = Number(tab.totalAmount);
      const payments = await prisma.ledgerEntry.aggregate({
        where: {
          source: "BAR",
          refType: "BAR_TAB",
          refId: tab.id,
          kind: "COLLECTED",
        },
        _sum: { amount: true },
      });
      const collectedAmount = Number(payments._sum.amount || 0);
      const balance = totalAmount - collectedAmount;

      if (balance > 0.01) {
        return {
          success: false,
          error: `Cannot free table: tab has an outstanding balance of â‚¹${balance.toFixed(0)}.`,
        };
      }

      // Check open kitchen orders: NEW, PREPARING, READY (or ACCEPTED)
      const hasOpenOrders = tab.orders.some((o) =>
        ["NEW", "ACCEPTED", "PREPARING", "READY"].includes(o.status)
      );
      if (hasOpenOrders) {
        return {
          success: false,
          error: "Cannot free table: kitchen orders are still active/preparing.",
        };
      }

      // Safe to close/cancel tab and free table
      await prisma.$transaction(async (tx) => {
        await tx.tab.update({
          where: { id: tab.id },
          data: {
            status: "CLOSED",
            closedAt: new Date(),
          },
        });
      });
    }

    revalidatePath("/admin/bar");
    revalidatePath("/kitchen");
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to free table.",
    };
  }
}

const addOrderSchema = z.object({
  tabId: z.string().min(1),
  personLabel: z.string().optional().nullable(),
  items: z.array(
    z.object({
      barItemId: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).min(1, "Must order at least one item"),
});

export async function addOrderToTabAction(data: {
  tabId: string;
  personLabel?: string | null;
  items: Array<{ barItemId: string; quantity: number }>;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Staff authentication required." };
    }

    const parsed = addOrderSchema.parse(data);
    const result = await addOrderToTab({
      ...parsed,
      staffUserId: user.id,
    });

    if (result.success) {
      revalidatePath("/admin/bar");
      revalidatePath("/kitchen");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add items to tab.",
    };
  }
}

export async function updateBarOrderStatusAction(data: {
  orderId: string;
  status: BarOrderStatus;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Staff authentication required." };
    }

    const result = await updateBarOrderStatus(data.orderId, data.status, user.id);

    if (result.success) {
      revalidatePath("/kitchen");
      revalidatePath("/admin/bar");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update order status.",
    };
  }
}

const payTabSchema = z.object({
  tabId: z.string().min(1),
  payments: z.array(
    z.object({
      method: z.enum(["CASH", "CARD", "UPI", "ONLINE"]),
      amount: z.number().positive(),
      personLabel: z.string().optional(),
    })
  ).min(1, "Must provide at least one payment method and amount"),
});

export async function payTabAction(data: {
  tabId: string;
  payments: SplitPaymentInput[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "OWNER" && user.role !== "STAFF")) {
      return { success: false, error: "Staff authentication required." };
    }

    const parsed = payTabSchema.parse(data);
    const result = await payTab({
      tabId: parsed.tabId,
      payments: parsed.payments,
      staffUserId: user.id,
    });

    if (result.success) {
      revalidatePath("/admin/bar");
      revalidatePath("/admin/finance");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to process tab payment.",
    };
  }
}

export async function getKitchenOrdersAction() {
  try {
    return await getKitchenOrders();
  } catch {
    return [];
  }
}

export async function getShiftReportAction() {
  try {
    const user = await getCurrentUser();
    return await getShiftCloseReport(user?.id);
  } catch (error: unknown) {
    return null;
  }
}
