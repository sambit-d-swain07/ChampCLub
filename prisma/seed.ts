import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { auth } from "../src/lib/auth";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/chamclub?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- Resetting Users & Seeding Requested Accounts ---");

  const ownerPassword = process.env.SEED_OWNER_PASSWORD || "Owner@123";
  const staff1Password = process.env.SEED_STAFF1_PASSWORD || "Staff1@123";
  const staff2Password = process.env.SEED_STAFF2_PASSWORD || "Staff2@123";

  // 1. Delete ALL existing users, sessions, and accounts in correct order
  console.log("Unlinking Member rows (setting userId to null)...");
  await prisma.member.updateMany({
    data: { userId: null },
  });

  console.log("Clearing sessions and accounts...");
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();

  console.log("Deleting all existing users...");
  const deleted = await prisma.user.deleteMany();
  console.log(`Deleted ${deleted.count} existing users.`);

  // 2. Helper to create users via Better Auth API
  async function createAccount(
    name: string,
    email: string,
    password: string,
    role: "OWNER" | "STAFF" | "MEMBER"
  ) {
    console.log(`Creating ${role} account: ${email}...`);
    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });

    const user = await prisma.user.update({
      where: { id: result.user.id },
      data: { role },
    });

    return user;
  }

  // 3. Create requested accounts
  const owner = await createAccount("Club Owner", "owner@gmail.com", ownerPassword, "OWNER");
  const staff1 = await createAccount("Front Desk Staff", "staff1@gmail.com", staff1Password, "STAFF");
  const staff2 = await createAccount("F&B Bar Staff", "staff2@gmail.com", staff2Password, "STAFF");

  console.log("--- Created Accounts ---");
  console.log(`Owner:   owner@gmail.com   (Role: ${owner.role})`);
  console.log(`Staff 1: staff1@gmail.com  (Role: ${staff1.role})`);
  console.log(`Staff 2: staff2@gmail.com  (Role: ${staff2.role})`);
  console.log("------------------------");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
