-- Add cancelReason to Booking
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

-- Drop Lead and AuditLog tables (safe, no FK deps)
DROP TABLE IF EXISTS "Lead";
DROP TABLE IF EXISTS "AuditLog";
