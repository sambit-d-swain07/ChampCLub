import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

let connectionString = process.env.DATABASE_URL || "";

// Automatically route through Supabase Transaction Pooler (port 6543) instead of Session mode (port 5432)
if (connectionString.includes("supabase.co") || connectionString.includes("pooler.supabase.com")) {
  // If direct database URL db.ref.supabase.co:5432 is used, route through pooler
  if (connectionString.includes("db.") && connectionString.includes(".supabase.co")) {
    const match = connectionString.match(/db\.([a-zA-Z0-9]+)\.supabase\.co/);
    if (match) {
      const ref = match[1];
      connectionString = connectionString.replace(`db.${ref}.supabase.co:5432`, "aws-1-ap-southeast-1.pooler.supabase.com:6543");
      connectionString = connectionString.replace(`db.${ref}.supabase.co`, "aws-1-ap-southeast-1.pooler.supabase.com:6543");
      if (!connectionString.includes(`postgres.${ref}`)) {
        connectionString = connectionString.replace("postgresql://postgres:", `postgresql://postgres.${ref}:`);
      }
    }
  }

  // Replace session port 5432 with transaction pooler port 6543
  if (connectionString.includes(":5432")) {
    connectionString = connectionString.replace(":5432", ":6543");
  }

  // Ensure transaction pooler pgbouncer parameter is present
  if (!connectionString.includes("pgbouncer=true")) {
    connectionString += (connectionString.includes("?") ? "&" : "?") + "pgbouncer=true";
  }
}

// Serverless connection pooler configuration
export const pool =
  globalForPrisma.pool ||
  new Pool({
    connectionString,
    max: 1, // Single connection per serverless function to prevent pool exhaustion on Vercel
    idleTimeoutMillis: 5000, // Release idle connection quickly (5s)
    connectionTimeoutMillis: 8000,
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
        msg.includes("SASL") ||
        msg.includes("EMAXCONN");

      if (attempt > retries || !isTransient) {
        throw err;
      }
      console.warn(`[Prisma Retry] Transient database error (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms:`, msg);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error("Database operation failed after retries.");
}
