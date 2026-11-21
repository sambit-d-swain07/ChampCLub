import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

let connectionString = process.env.DATABASE_URL || "";
if (connectionString.includes(":6543") && !connectionString.includes("pgbouncer=true")) {
  connectionString += (connectionString.includes("?") ? "&" : "?") + "pgbouncer=true";
}

// Serverless connection pooler configuration
export const pool =
  globalForPrisma.pool ||
  new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 3 : 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

// Handle idle connection drops gracefully so they don't cause 500 errors
pool.on("error", (err) => {
  console.warn("[Prisma Pool] Handled idle client error:", err.message);
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

// Always retain global singleton in all environments to prevent connection pool exhaustion on serverless
globalForPrisma.prisma = prisma;
globalForPrisma.pool = pool;

/**
 * Executes a database operation with automatic retry on cold-start/transient connection errors.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  retries = 2,
  delayMs = 300
): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await operation();
    } catch (err: unknown) {
      attempt++;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes("connection") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("timeout") ||
        msg.includes("closed") ||
        msg.includes("SASL");

      if (attempt > retries || !isTransient) {
        throw err;
      }
      console.warn(`[Prisma Retry] Transient database error (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms:`, msg);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error("Database operation failed after retries.");
}
