"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  placeOrder,
  restockProduct,
  updateOrderStatus,
} from "@/lib/services/shop";

const placeOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
    })
  ).min(1, "Order must contain at least one item"),
  channel: z.enum(["COUNTER", "ONLINE"]),
  memberId: z.string().optional().nullable(),
  guestName: z.string().optional().nullable(),
  fulfilment: z.enum(["PICKUP", "DELIVERY"]).optional(),
  deliveryAddress: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "CARD", "UPI", "ONLINE"]).optional(),
});

export async function placeCounterOrderAction(data: {
  items: Array<{ productId: string; quantity: number }>;
  memberId?: string | null;
  guestName?: string | null;
  paymentMethod: "CASH" | "CARD" | "UPI" | "ONLINE";
  clientRequestId?: string | null;
}) {
  try {
    if (data.memberId) {
      const memberRec = await prisma.member.findUnique({
        where: { id: data.memberId },
        include: { user: true },
      });
      if (memberRec?.user?.bannedAt) {
        return { success: false, error: "This account is banned and cannot make purchases." };
      }
    }

    const parsed = placeOrderSchema.parse({
      items: data.items,
      channel: "COUNTER",
      memberId: data.memberId,
      guestName: data.guestName,
      fulfilment: "PICKUP",
      paymentMethod: data.paymentMethod,
    });

    const result = await placeOrder({
      ...parsed,
      clientRequestId: data.clientRequestId,
    });

    if (result.success) {
      revalidatePath("/admin/shop");
      revalidatePath("/admin");
    }

    return result;
  } catch (error: unknown) {
    console.error("[placeCounterOrderAction error]:", error);
    return {
      success: false,
      error: "Payment did not go through. Please try again.",
    };
  }
}

export async function placeOnlineOrderAction(data: {
  items: Array<{ productId: string; quantity: number }>;
  fulfilment: "PICKUP" | "DELIVERY";
  deliveryAddress?: string | null;
  paymentMethod?: "CASH" | "CARD" | "UPI";
  clientRequestId?: string | null;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Please sign in to place an online order." };
    }

    const member = await prisma.member.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    if (member?.user?.bannedAt) {
      return { success: false, error: "This account is banned and cannot place orders." };
    }

    const parsed = placeOrderSchema.parse({
      items: data.items,
      channel: "ONLINE",
      memberId: member?.id || null,
      fulfilment: data.fulfilment,
      deliveryAddress: data.deliveryAddress,
      paymentMethod: data.paymentMethod || "CASH",
    });

    const result = await placeOrder({
      ...parsed,
      clientRequestId: data.clientRequestId,
    });

    if (result.success) {
      revalidatePath("/member/shop");
      revalidatePath("/member");
      revalidatePath("/admin/shop");
    }

    return result;
  } catch (error: unknown) {
    console.error("[placeOnlineOrderAction error]:", error);
    return {
      success: false,
      error: "Payment did not go through. Please try again.",
    };
  }
}

export async function restockProductAction(
  data: { productId: string; addQty: number } | FormData
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Staff authentication required." };
    }

    let productId: string;
    let addQty: number;

    if (data instanceof FormData) {
      productId = data.get("productId") as string;
      addQty = parseInt(data.get("addQty") as string, 10);
    } else {
      productId = data.productId;
      addQty = data.addQty;
    }

    if (!productId || isNaN(addQty) || addQty <= 0) {
      return { success: false, error: "Valid restock quantity required." };
    }

    const result = await restockProduct({
      productId,
      addQty,
      staffUserId: user.id,
    });

    if (result.success) {
      revalidatePath("/admin/shop");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restock product",
    };
  }
}

export async function updateOrderStatusAction(data: {
  orderId: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
}) {
  try {
    const user = await getCurrentUser();
    const result = await updateOrderStatus({
      orderId: data.orderId,
      status: data.status,
      staffUserId: user?.id,
    });

    if (result.success) {
      revalidatePath("/admin/shop");
      revalidatePath("/member/shop");
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update order status",
    };
  }
}
