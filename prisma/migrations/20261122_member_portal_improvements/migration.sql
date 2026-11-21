-- 1. Alter ShopFulfilment enum
ALTER TYPE "ShopFulfilment" ADD VALUE IF NOT EXISTS 'COURT';

-- 2. Alter ShopOrderStatus enum
ALTER TYPE "ShopOrderStatus" ADD VALUE IF NOT EXISTS 'PLACED';
ALTER TYPE "ShopOrderStatus" ADD VALUE IF NOT EXISTS 'READY';
ALTER TYPE "ShopOrderStatus" ADD VALUE IF NOT EXISTS 'PACKED';
ALTER TYPE "ShopOrderStatus" ADD VALUE IF NOT EXISTS 'OUT_FOR_DELIVERY';
ALTER TYPE "ShopOrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "ShopOrderStatus" ADD VALUE IF NOT EXISTS 'COLLECTED';

-- 3. Add Member dateOfBirth
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);

-- 4. Add Membership replacedAt and nextPlanId
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "replacedAt" TIMESTAMP(3);
ALTER TABLE "Membership" ADD COLUMN IF NOT EXISTS "nextPlanId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Membership_nextPlanId_fkey'
  ) THEN
    ALTER TABLE "Membership" ADD CONSTRAINT "Membership_nextPlanId_fkey" FOREIGN KEY ("nextPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Membership_memberId_replacedAt_idx" ON "Membership"("memberId", "replacedAt");
CREATE INDEX IF NOT EXISTS "Membership_nextPlanId_idx" ON "Membership"("nextPlanId");

-- 5. Add MemberAddress table
CREATE TABLE IF NOT EXISTS "MemberAddress" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "line1" TEXT NOT NULL,
  "line2" TEXT,
  "landmark" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemberAddress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemberAddress_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MemberAddress_memberId_idx" ON "MemberAddress"("memberId");

-- 6. Add ShopOrder columns
ALTER TABLE "ShopOrder" ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT;
ALTER TABLE "ShopOrder" ADD COLUMN IF NOT EXISTS "deliveryPhone" TEXT;
ALTER TABLE "ShopOrder" ADD COLUMN IF NOT EXISTS "courtLabel" TEXT;
ALTER TABLE "ShopOrder" ADD COLUMN IF NOT EXISTS "deliveryFee" DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE "ShopOrder" ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';

-- 7. Normalize categories: capitalize trim, merge RACKETS into Rackets
UPDATE "Product" SET "category" = 'Rackets' WHERE UPPER(TRIM("category")) = 'RACKETS';
UPDATE "Product" SET "category" = INITCAP(TRIM("category"));

-- 8. One-time data fix: for every member with more than one active non-replaced membership,
-- keep the one with the latest startsAt and set replacedAt = NOW() on the others
WITH ranked AS (
  SELECT id, "memberId", "startsAt",
    ROW_NUMBER() OVER (PARTITION BY "memberId" ORDER BY "startsAt" DESC, "createdAt" DESC) as rn
  FROM "Membership"
  WHERE "replacedAt" IS NULL
    AND "endsAt" > NOW()
)
UPDATE "Membership"
SET "replacedAt" = NOW()
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);
