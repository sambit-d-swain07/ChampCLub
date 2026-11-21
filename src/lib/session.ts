import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/prisma";
import { headers } from "next/headers";

export const getSession = cache(async () => {
  try {
    const reqHeaders = await headers();

    // 1. Try Better Auth's standard session retrieval with nextCookies support
    try {
      const authSession = await auth.api.getSession({
        headers: reqHeaders,
      });
      if (authSession?.user) {
        return authSession;
      }
    } catch (e: any) {
      if (e?.digest?.startsWith("DYNAMIC_SERVER_USAGE") || e?.digest?.startsWith("NEXT_REDIRECT")) {
        throw e;
      }
      console.warn("[Session] auth.api.getSession error, falling back to direct token lookup:", e?.message);
    }

    // 2. Direct database fallback: Parse session cookie directly from incoming request headers
    const cookieHeader = reqHeaders.get("cookie") || "";
    const sessionMatch = cookieHeader.match(/(?:__Secure-)?better-auth\.session_token=([^;]+)/);
    if (!sessionMatch) {
      return null;
    }

    const rawCookieVal = decodeURIComponent(sessionMatch[1]);
    // Better Auth signs cookies using format `token.signature`
    const token = rawCookieVal.split(".")[0];
    if (!token) {
      return null;
    }

    const dbSession = await withDbRetry(() =>
      prisma.session.findUnique({
        where: { token },
        include: { user: true },
      })
    );

    if (!dbSession || new Date(dbSession.expiresAt) <= new Date()) {
      return null;
    }

    return {
      session: {
        id: dbSession.id,
        userId: dbSession.userId,
        token: dbSession.token,
        expiresAt: dbSession.expiresAt,
        createdAt: dbSession.createdAt,
        updatedAt: dbSession.updatedAt,
        ipAddress: dbSession.ipAddress,
        userAgent: dbSession.userAgent,
      },
      user: {
        id: dbSession.user.id,
        name: dbSession.user.name,
        email: dbSession.user.email,
        emailVerified: dbSession.user.emailVerified,
        image: dbSession.user.image,
        role: dbSession.user.role,
        createdAt: dbSession.user.createdAt,
        updatedAt: dbSession.user.updatedAt,
      },
    };
  } catch (err: any) {
    if (err?.digest?.startsWith("DYNAMIC_SERVER_USAGE") || err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("[Session] Unexpected error resolving session:", err);
    return null;
  }
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  return session?.user || null;
});
