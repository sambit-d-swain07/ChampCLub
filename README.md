# The Champions Club — Sports Club Management System

A sports club management system built with Next.js 16 (App Router), TypeScript, Tailwind CSS, PostgreSQL (Supabase), Prisma 7, and Better Auth.

Designed for luxury multi-sport facilities offering Tennis, Padel, and Badminton with an integrated Pro Shop, Champions Bar & Cafeteria, digital turnstile passes, dynamic court scheduling, and executive financial governance.

---

## 1. Setup & Installation

### Prerequisites
- Node.js 20+
- PostgreSQL database (Supabase, Neon, or local PostgreSQL with `btree_gist` extension enabled)

### Local Setup
```bash
# Clone the repository
git clone https://github.com/sambit-d-swain07/ChampCLub.git
cd ChampCLub

# Install dependencies
npm install

# Push database schema & constraints
npx prisma db push

# Apply Postgres exclusion constraint (for atomic court double-booking prevention)
npx prisma db execute --file ./prisma/apply_constraint.sql

# Seed the database
npm run seed

# Start the development server
npm run dev
```

---

## 2. Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
# Database Connection (Transaction Pooler port 6543 recommended on Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"

# Better Auth
BETTER_AUTH_SECRET="chamclub-hackathon-secret-key-32chars-minimum!!"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Pre-defined Seed Account Passwords
SEED_OWNER_PASSWORD="Owner@123"
SEED_STAFF1_PASSWORD="Staff1@123"
SEED_STAFF2_PASSWORD="Staff2@123"

# Optional Trial Session Fee (default 500)
TRIAL_BOOKING_FEE="500"
```

---

## 3. Database Seed Command

To seed or reset standard club courts, products, bar menu items, tables, pricing rules, and demo accounts:

```bash
npm run seed
```

The seed script is safe to run multiple times: it upserts pre-defined accounts and preserves existing transaction history.

---

## 4. Demo Login Accounts

Three pre-configured role-based accounts are available for demo testing:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **OWNER** | `owner@gmail.com` | `Owner@123` | Full access: Executive Dashboard, Finance, Expenses, Ledger, Audit, Operations |
| **STAFF 1** | `staff1@gmail.com` | `Staff1@123` | Operations: Courts, Member Lounge, Pro Shop POS, Bar POS, Kitchen Board, Leads |
| **STAFF 2** | `staff2@gmail.com` | `Staff2@123` | Shift handover staff member for dual-terminal operations and order handling |

*Note: 1-click login buttons for all three accounts are available on the `/login` screen for rapid hackathon testing.*

---

## 5. System Architecture Highlights

1. **Double-Entry Financial Ledger**: Single `LedgerEntry` table records all transactions (`EARNED`, `COLLECTED`, `REFUNDED`) across Courts, Shop, Bar, and Memberships.
2. **Double-Booking Prevention**: Enforced at the database engine level via PostgreSQL `btree_gist` exclusion constraints and transaction advisory locks.
3. **Atomic Inventory Control**: Concurrency-safe decrement (`WHERE id = ? AND stockQty >= n`) prevents overselling shared shop stock.
4. **Kitchen Order Board**: Live polling board with order state transitions (`NEW` → `PREPARING` → `READY` → `SERVED`) triggering revenue recognition upon service.
5. **Entitlement Engine**: Centralized privilege resolver calculates real-time member discounts and turnstile validity with a 7-day grace period.

---

## 6. Known Limitations

- **No Real Payment Gateway**: Payment methods (`CASH`, `CARD`, `UPI`, `ONLINE`) record immediate ledger collections without external gateway callbacks (e.g., Razorpay/Stripe webhooks are simulated for demo velocity).
- **No Email or WhatsApp Dispatch**: Membership quotes (`/admin/leads/[id]/quote`) and receipts are rendered as clean, high-resolution print/PDF views rather than sending SMTP emails or WhatsApp messages.
- **No Payroll or Tax Depreciation**: The `/admin/expenses` ledger tracks direct operational disbursements and accounts payable, but does not calculate statutory employee tax withholdings, GST reconciliation reports, or asset depreciation schedules.
