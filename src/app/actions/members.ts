"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createMemberService, renewMemberService } from "@/lib/services/members";
import { PaymentMethod } from "@prisma/client";

const registerMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  planId: z.string().min(1, "Plan selection required"),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

const renewMemberSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().min(1),
  paymentMethod: z.nativeEnum(PaymentMethod),
});

export async function registerMemberAction(formData: FormData) {
  try {
    const raw = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      planId: formData.get("planId") as string,
      paymentMethod: (formData.get("paymentMethod") as PaymentMethod) || PaymentMethod.UPI,
    };

    const parsed = registerMemberSchema.parse(raw);
    const member = await createMemberService(parsed);

    revalidatePath("/admin/members");
    revalidatePath("/admin");

    return { success: true, memberId: member.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to register member." };
  }
}

export async function renewMemberAction(formData: FormData) {
  try {
    const raw = {
      memberId: formData.get("memberId") as string,
      planId: formData.get("planId") as string,
      paymentMethod: (formData.get("paymentMethod") as PaymentMethod) || PaymentMethod.UPI,
    };

    const parsed = renewMemberSchema.parse(raw);
    await renewMemberService(parsed);

    revalidatePath(`/admin/members/${parsed.memberId}`);
    revalidatePath("/admin/members");
    revalidatePath("/admin");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to renew membership." };
  }
}
