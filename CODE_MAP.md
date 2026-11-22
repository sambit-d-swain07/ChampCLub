# Champions Club - System Code Map

This document maps the primary business flows, role security layers, database constraints, and state transitions across the application codebase.

---

## 1. Sign-Up Flow
- **File**: `src/app/actions/members.ts`
- **Function**: `signUpMemberAction`
- **Line**: Line 275
- **Explanation**: Validates name, phone, email, date of birth, and password via Zod before invoking Better Auth's `signUpEmail` to create `User` and `Account` records. Immediately updates the role to `MEMBER` and creates the `Member` record with unique `membershipNo` (`CC-2026-XXX`) and randomized `qrToken`.

---

## 2. Login and Banned-User Check
- **File**: `src/components/auth/login-form.tsx`
- **Function**: `performLogin`
- **Line**: Line 45
- **Explanation**: Authenticates credentials using Better Auth client `signIn.email` and, upon successful authentication, immediately verifies account standing via `checkUserBanAction` (`src/app/actions/members.ts#L77`). If `bannedAt` is present on the user, it immediately forces `signOut()`, terminates the session, and halts navigation with a banned notice.

---

## 3. Role Guards for OWNER, STAFF, and MEMBER Routes
- **File**: `src/middleware.ts` & `src/app/admin/layout.tsx` & `src/app/member/layout.tsx`
- **Function**: `middleware`, `AdminLayout`, `MemberLayout`
- **Line**: `src/middleware.ts#L4`, `src/app/admin/layout.tsx#L5`, `src/app/member/layout.tsx#L8`
- **Explanation**: Edge middleware performs a zero-database cookie inspection on all `/admin/*` and `/member/*` routes, redirecting unauthenticated visitors to `/login`. Route layouts enforce role separation via server-side session checks: `AdminLayout` blocks `MEMBER` users with a redirect to `/member`, while `MemberLayout` redirects `OWNER` to `/admin/owner` and `STAFF` to `/admin/members`.

---

## 4. Entitlement Function
- **File**: `src/lib/services/entitlement.ts`
- **Function**: `resolve`
- **Line**: Line 25
- **Explanation**: Evaluates a member's active plan, compute-only 7-day grace period, daily quota, and discounts across courts, pro shop, and bar. For Junior plans, enforces that discounts apply exclusively when `ageVerifiedAt` is populated and age is under 18, while capping expiry at the 18th birthday and setting `PENDING_VERIFICATION` otherwise.

---

## 5. Court Booking Flow & Constraints
- **File**: `src/lib/services/booking.ts` & `prisma/migrations/20261121000000_init/migration.sql`
- **Function**: `getCourtAvailability` (#L657), `createBooking` (#L111), `confirmBooking` (#L264)
- **Line**: Availability `#L657`, Hold `#L201`, Confirm `#L264`, Lock `#L150`, Migration `#L516-L522`
- **Explanation**: `getCourtAvailability` cleans up expired holds and returns 30-minute slot availability; `createBooking` acquires a PostgreSQL transaction advisory lock (`pg_advisory_xact_lock`) on the member ID to enforce the max-2-sessions-per-day limit before inserting a `HELD` slot with a 5-minute expiry. Concurrency overlap prevention is guaranteed at the database engine level via PostgreSQL GiST exclusion constraint `no_overlapping_normal_bookings` (`EXCLUDE USING gist (courtId WITH =, tsrange(startsAt, endsAt) WITH &&)`), and `confirmBooking` marks the held slot `CONFIRMED` while writing earned/collected ledger entries.

---

## 6. Pro Shop Checkout with Atomic Stock Decrement
- **File**: `src/lib/services/shop.ts`
- **Function**: `placeOrder`
- **Line**: Line 30
- **Explanation**: Executes in an interactive database transaction where each ordered item runs an atomic SQL decrement: `UPDATE "Product" SET "stockQty" = "stockQty" - qty WHERE "id" = id AND "stockQty" >= qty`. If any row update returns count 0, the transaction immediately rolls back to prevent overselling, creates the `ShopOrder`, and commits matching `EARNED` and `COLLECTED` ledger entries.

---

## 7. Bar Tab and Order Flow
- **File**: `src/lib/services/bar.ts`
- **Function**: `openTab` (#L165), `addOrderToTab` (#L206), `payTab` (#L453)
- **Line**: Open `#L165`, Add Order `#L206`, Settle `#L453`
- **Explanation**: `openTab` creates an `OPEN` tab linked to a table and optional member; `addOrderToTab` attaches itemized rounds with person labels and recalculates tab totals with member F&B discounts. `payTab` marks the tab `CLOSED`, sets all constituent orders to `SERVED`, and records a `COLLECTED` ledger entry categorized under the `BAR` source.

---

## 8. Ledger Entry Writes
- **File**: `src/lib/services/booking.ts`, `src/lib/services/shop.ts`, `src/lib/services/bar.ts`, `src/app/actions/members.ts`
- **Function**: `confirmBooking` (#L319), `placeOrder` (#L147), `payTab` (#L499), `choosePlanAction` (#L493)
- **Line**: Booking `#L319`, Shop `#L147`, Bar `#L499`, Membership `#L493`
- **Explanation**: Implements double-entry cash and accrual tracking across the club by creating `LedgerEntry` records with kinds `EARNED` (when services/goods are delivered), `COLLECTED` (when cash/UPI/card payments clear), and `REFUNDED` (on cancellations). Sources are explicitly categorized into `COURT`, `SHOP`, `BAR`, and `MEMBERSHIP` with polymorphic references to `refType` and `refId`.

---

## 9. Plan Change (Upgrade, Downgrade, Same-Plan Block)
- **File**: `src/app/actions/members.ts`
- **Function**: `choosePlanAction`
- **Line**: Line 381
- **Explanation**: Blocks selection of the current active plan with an error, prohibits Junior selection for members aged 18 or older, and handles upgrades by applying credit from the previous plan and creating an active replacement. For downgrades, sets `nextPlanId` on the active membership so the lower tier automatically defers until the current paid period concludes.

---

## 10. Ban and Unban Actions (Reversible by Owner)
- **File**: `src/app/actions/members.ts`
- **Function**: `banMemberAction` (#L115), `unbanMemberAction` (#L213)
- **Line**: Ban `#L115`, Unban `#L213`
- **Explanation**: Member bans are reversible by the owner. `banMemberAction` (staff and owner) requires confirmation of the member ID, sets `bannedAt`, `bannedById`, and `bannedReason` (including "False age information") on the `User` record, revokes all active sessions, cancels upcoming bookings with reason "Account banned", and writes a "BAN" entry in `MemberAuditLog`. `unbanMemberAction` (strictly restricted to the club owner server-side) atomically clears `bannedAt`, `bannedById`, and `bannedReason` on the `User` record and appends an "UNBAN" entry in `MemberAuditLog`, instantly reinstating login access, quota, and discount entitlements without reviving cancelled bookings.

---

## Prisma Schema Models Table

| Model Name | Primary Key | Unique Fields / Constraints | Foreign Keys & Relations |
| :--- | :--- | :--- | :--- |
| **User** | `id` (String / cuid) | `email` | None (has many `Session`, `Account`, optional one-to-one `Member`) |
| **Session** | `id` (String / cuid) | `token` | `userId` &rarr; `User.id` (onDelete: Cascade) |
| **Account** | `id` (String / cuid) | None (composite provider ID via Better Auth) | `userId` &rarr; `User.id` (onDelete: Cascade) |
| **Verification** | `id` (String / cuid) | None (`identifier` indexed) | None |
| **Member** | `id` (String / cuid) | `userId`, `membershipNo`, `qrToken` | `userId` &rarr; `User.id` (onDelete: SetNull) |
| **MemberAddress** | `id` (String / cuid) | None (`memberId` indexed) | `memberId` &rarr; `Member.id` (onDelete: Cascade) |
| **MemberAuditLog**| `id` (String / cuid) | None (`memberId`, `createdAt` indexed) | `memberId` &rarr; `Member.id` (onDelete: Cascade) |
| **Plan** | `id` (String / cuid) | `name` | None (referenced by `Membership.planId`, `Membership.nextPlanId`, `PricingRule.planId`) |
| **Membership** | `id` (String / cuid) | None (`memberId`, `planId`, `endsAt`, `replacedAt` indexed) | `memberId` &rarr; `Member.id` (Cascade), `planId` &rarr; `Plan.id` (Restrict), `nextPlanId` &rarr; `Plan.id` (SetNull) |
| **Court** | `id` (String / cuid) | None | None (referenced by `Booking.courtId`) |
| **PricingRule** | `id` (String / cuid) | None (`sport`, `planId` indexed) | `planId` &rarr; `Plan.id` (onDelete: SetNull) |
| **Booking** | `id` (String / cuid) | GiST exclusion constraint (`courtId`, `tsrange(startsAt, endsAt)`) where kind='NORMAL' & status in ('HELD', 'CONFIRMED') | `courtId` &rarr; `Court.id` (Cascade), `memberId` &rarr; `Member.id` (SetNull) |
| **BookingParticipant** | `id` (String / cuid) | None (`bookingId`, `memberId` indexed) | `bookingId` &rarr; `Booking.id` (Cascade), `memberId` &rarr; `Member.id` (SetNull) |
| **Product** | `id` (String / cuid) | None | None (referenced by `ShopOrderItem.productId`) |
| **ShopOrder** | `id` (String / cuid) | None (`memberId`, `createdAt` indexed) | `memberId` &rarr; `Member.id` (onDelete: SetNull) |
| **ShopOrderItem** | `id` (String / cuid) | None (`orderId`, `productId` indexed) | `orderId` &rarr; `ShopOrder.id` (Cascade), `productId` &rarr; `Product.id` (Restrict) |
| **BarItem** | `id` (String / cuid) | None | None (referenced by `BarOrderItem.barItemId`) |
| **BarTable** | `id` (String / cuid) | None | None (referenced by `Tab.tableId`) |
| **Tab** | `id` (String / cuid) | None (`memberId`, `tableId`, `status` indexed) | `memberId` &rarr; `Member.id` (SetNull), `tableId` &rarr; `BarTable.id` (SetNull) |
| **BarOrder** | `id` (String / cuid) | None (`tabId` indexed) | `tabId` &rarr; `Tab.id` (onDelete: Cascade) |
| **BarOrderItem** | `id` (String / cuid) | None (`orderId`, `barItemId` indexed) | `orderId` &rarr; `BarOrder.id` (Cascade), `barItemId` &rarr; `BarItem.id` (Restrict) |
| **Expense** | `id` (String / cuid) | None | None |
| **LedgerEntry** | `id` (String / cuid) | None (`source`, `createdAt`, `refType, refId`, `createdAt, source, kind` indexed) | None (polymorphic ref to `refType`, `refId`) |
