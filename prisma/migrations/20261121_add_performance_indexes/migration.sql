-- CreateIndex
CREATE INDEX IF NOT EXISTS "Membership_memberId_endsAt_idx" ON "Membership"("memberId", "endsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_courtId_startsAt_idx" ON "Booking"("courtId", "startsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_memberId_startsAt_idx" ON "Booking"("memberId", "startsAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ShopOrder_createdAt_idx" ON "ShopOrder"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Tab_status_idx" ON "Tab"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LedgerEntry_createdAt_source_kind_idx" ON "LedgerEntry"("createdAt", "source", "kind");
