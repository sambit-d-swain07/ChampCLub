-- AlterTable MemberAuditLog
ALTER TABLE "MemberAuditLog" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE "MemberAuditLog" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "MemberAuditLog" ADD COLUMN IF NOT EXISTS "actorId" TEXT;
