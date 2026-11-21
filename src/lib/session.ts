import { cache } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const getSession = cache(async () => {
  try {
    const reqHeaders = await headers();
    return await auth.api.getSession({
      headers: reqHeaders,
    });
  } catch (err: any) {
    if (err?.digest?.startsWith("DYNAMIC_SERVER_USAGE") || err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    return null;
  }
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  return session?.user || null;
});
