CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
DROP CONSTRAINT IF EXISTS "no_overlapping_normal_bookings";

ALTER TABLE "Booking"
ADD CONSTRAINT "no_overlapping_normal_bookings"
EXCLUDE USING gist (
  "courtId" WITH =,
  tsrange("startsAt", "endsAt") WITH &&
)
WHERE ("kind" = 'NORMAL' AND "status" IN ('HELD', 'CONFIRMED'));
