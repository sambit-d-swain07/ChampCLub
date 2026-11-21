import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

// In production, always prefer the real Vercel URL over any localhost override
const baseURL =
  (process.env.NODE_ENV === "production" &&
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null) ||
  (process.env.NODE_ENV === "production" && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : null) ||
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://champ-creator.vercel.app"
    : "http://localhost:3000");

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET || "chamclub-hackathon-secret-key-32chars-minimum!!",
  baseURL,
  trustedOrigins: async (request) => {
    const list = [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://champ-creator.vercel.app",
      "https://*.vercel.app",
      ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
      ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ];
    if (request) {
      const origin = request.headers.get("origin") || request.headers.get("referer");
      if (origin) {
        try {
          const u = new URL(origin);
          list.push(u.origin);
        } catch {}
      }
      const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
      if (host) {
        list.push(`https://${host}`);
        list.push(`http://${host}`);
      }
    }
    return Array.from(new Set(list));
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "MEMBER",
        input: false,
      },
    },
  },
});
