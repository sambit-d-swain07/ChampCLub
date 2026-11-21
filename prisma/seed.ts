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
  console.log("--- Starting The Champions Club Seed Script ---");

  // Verify required environment variables for passwords
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  const staffPassword = process.env.SEED_STAFF_PASSWORD;
  const memberPassword = process.env.SEED_MEMBER_PASSWORD;

  if (!ownerPassword || !staffPassword || !memberPassword) {
    throw new Error(
      "Missing required seed password environment variables:\n" +
        "- SEED_OWNER_PASSWORD\n" +
        "- SEED_STAFF_PASSWORD\n" +
        "- SEED_MEMBER_PASSWORD\n" +
        "Please configure them in your .env file."
    );
  }

  // 1. Reset users if existing non-target users exist, or if unlinked
  const targetEmails = [
    "owner@championsclub.test",
    "staff1@championsclub.test",
    "staff2@championsclub.test",
    "member@championsclub.test",
  ];

  const nonTargetUsers = await prisma.user.findMany({
    where: {
      email: { notIn: targetEmails },
    },
    select: { id: true, email: true },
  });

  if (nonTargetUsers.length > 0) {
    console.log(
      `Found ${nonTargetUsers.length} legacy/non-target users. Resetting user tables while preserving business data...`
    );

    // Step a: Unlink Member rows (set userId to null instead of deleting member)
    const unlinked = await prisma.member.updateMany({
      data: { userId: null },
    });
    console.log(`Unlinked ${unlinked.count} member rows.`);

    // Step b: Delete sessions and accounts
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();

    // Step c: Delete users
    const deletedUsers = await prisma.user.deleteMany();
    console.log(`Deleted ${deletedUsers.count} users.`);
  }

  // 2. Helper to get or create users using Better Auth's own API
  async function getOrCreateUser(
    name: string,
    email: string,
    password: string,
    role: "OWNER" | "STAFF" | "MEMBER"
  ) {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log(`[SKIP] User ${email} (${role}) already exists.`);
      return existing;
    }

    console.log(`[CREATE] Creating user via Better Auth API: ${email} (${role})...`);
    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });

    // Enforce role
    const updated = await prisma.user.update({
      where: { id: result.user.id },
      data: { role },
    });

    return updated;
  }

  // 3. Create the 4 pre-defined accounts
  const ownerUser = await getOrCreateUser(
    "Vikramaditya Singhania (Owner)",
    "owner@championsclub.test",
    ownerPassword,
    "OWNER"
  );

  const staff1 = await getOrCreateUser(
    "Arjun Mehta (Front Desk)",
    "staff1@championsclub.test",
    staffPassword,
    "STAFF"
  );

  const staff2 = await getOrCreateUser(
    "Neha Patel (Bar & F&B)",
    "staff2@championsclub.test",
    staffPassword,
    "STAFF"
  );

  const memberUser = await getOrCreateUser(
    "Aravind Sharma (Club Member)",
    "member@championsclub.test",
    memberPassword,
    "MEMBER"
  );

  // 4. Ensure Plans exist
  let plans = await prisma.plan.findMany();
  if (plans.length === 0) {
    console.log("Seeding membership plans...");
    const goldPlan = await prisma.plan.create({
      data: {
        name: "GOLD",
        price: 25000,
        durationDays: 365,
        courtDiscountPct: 20,
        shopDiscountPct: 15,
        barDiscountPct: 10,
      },
    });
    const silverPlan = await prisma.plan.create({
      data: {
        name: "SILVER",
        price: 15000,
        durationDays: 365,
        courtDiscountPct: 10,
        shopDiscountPct: 10,
        barDiscountPct: 5,
      },
    });
    const juniorPlan = await prisma.plan.create({
      data: {
        name: "JUNIOR",
        price: 8000,
        durationDays: 180,
        courtDiscountPct: 15,
        shopDiscountPct: 5,
        barDiscountPct: 0,
      },
    });
    plans = [goldPlan, silverPlan, juniorPlan];
  }

  // 5. Ensure Courts and Pricing Rules exist
  const courtCount = await prisma.court.count();
  if (courtCount === 0) {
    console.log("Seeding courts and pricing rules...");
    await Promise.all([
      prisma.court.create({ data: { name: "Tennis Court 1 (Championship)", sport: "TENNIS", capacity: 4 } }),
      prisma.court.create({ data: { name: "Tennis Court 2 (Grandstand)", sport: "TENNIS", capacity: 4 } }),
      prisma.court.create({ data: { name: "Padel Court 1 (Panoramic)", sport: "PADEL", capacity: 4 } }),
      prisma.court.create({ data: { name: "Padel Court 2 (Pro Court)", sport: "PADEL", capacity: 4 } }),
      prisma.court.create({ data: { name: "Badminton Court 1 (Teakwood)", sport: "BADMINTON", capacity: 4 } }),
      prisma.court.create({ data: { name: "Badminton Court 2 (Synthetic)", sport: "BADMINTON", capacity: 4 } }),
    ]);

    await Promise.all([
      prisma.pricingRule.create({ data: { sport: "TENNIS", basePrice: 1200 } }),
      prisma.pricingRule.create({ data: { sport: "PADEL", basePrice: 1500 } }),
      prisma.pricingRule.create({ data: { sport: "BADMINTON", basePrice: 800 } }),
    ]);
  }

  // 6. Ensure Members exist
  const memberCount = await prisma.member.count();
  if (memberCount === 0) {
    console.log("Seeding member base...");
    const memberNames = [
      "Dev Anand", "Rohit Sharma", "Sania Mirza", "Leander Paes", "Mahesh Bhupathi",
      "Rohan Bopanna", "P.V. Sindhu", "Saina Nehwal", "Prakash Padukone", "Kidambi Srikanth",
      "Ashwini Ponnappa", "Chirag Shetty", "Satwiksairaj Rankireddy", "Somdev Devvarman", "Ankita Raina",
      "Yuki Bhambri", "Prajnesh Gunneswaran", "Sumit Nagal", "Karman Kaur Thandi", "Rutuja Bhosale"
    ];

    const goldPlan = plans.find((p) => p.name === "GOLD") || plans[0];
    const silverPlan = plans.find((p) => p.name === "SILVER") || plans[1];
    const juniorPlan = plans.find((p) => p.name === "JUNIOR") || plans[2];

    const now = new Date();

    for (let i = 0; i < memberNames.length; i++) {
      const idx = i + 1;
      const plan = idx <= 8 ? goldPlan : idx <= 16 ? silverPlan : juniorPlan;

      const member = await prisma.member.create({
        data: {
          membershipNo: `CC-2026-${String(idx).padStart(3, "0")}`,
          qrToken: `QR-CC-${String(idx).padStart(3, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        },
      });

      const startsAt = new Date(now.getTime() - (idx * 15 + 30) * 24 * 60 * 60 * 1000);
      let endsAt: Date;
      if (idx === 1) {
        endsAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      } else if (idx === 2) {
        endsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      } else if (idx === 3) {
        endsAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      } else if (idx === 4) {
        endsAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      } else if (idx === 5) {
        endsAt = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      } else {
        endsAt = new Date(startsAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
      }

      const membership = await prisma.membership.create({
        data: {
          memberId: member.id,
          planId: plan.id,
          startsAt,
          endsAt,
          pricePaid: plan.price,
        },
      });

      await prisma.ledgerEntry.create({
        data: {
          source: "MEMBERSHIP",
          amount: plan.price,
          method: idx % 3 === 0 ? "UPI" : idx % 2 === 0 ? "CARD" : "CASH",
          kind: "COLLECTED",
          refType: "MEMBERSHIP",
          refId: membership.id,
          createdAt: startsAt,
        },
      });
    }
  }

  // 7. Link demo MEMBER (member@championsclub.test) to an existing seeded member
  const linkedMember = await prisma.member.findFirst({
    where: { userId: memberUser.id },
  });

  if (!linkedMember) {
    const targetMember = await prisma.member.findFirst({
      orderBy: { membershipNo: "asc" },
    });

    if (targetMember) {
      await prisma.member.update({
        where: { id: targetMember.id },
        data: { userId: memberUser.id },
      });
      console.log(
        `[LINK] Linked member@championsclub.test to existing member: ${targetMember.membershipNo}`
      );
    }
  } else {
    console.log(
      `[SKIP] member@championsclub.test is already linked to member: ${linkedMember.membershipNo}`
    );
  }

  console.log("--- Seeding Completed Successfully ---");
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
