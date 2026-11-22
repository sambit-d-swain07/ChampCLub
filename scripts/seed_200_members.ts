import "dotenv/config";
import { prisma } from "../src/lib/prisma";

// Realistic Indian & International club member profiles
const REAL_FIRST_NAMES = [
  "Aarav", "Rohan", "Vikram", "Siddharth", "Arjun", "Aditya", "Kabir", "Reyansh", "Karan", "Rahul",
  "Ananya", "Diya", "Priya", "Sneha", "Tanvi", "Kavya", "Ira", "Meera", "Shreya", "Riya",
  "Dev", "Rishi", "Samar", "Kunal", "Manish", "Amit", "Naveen", "Abhishek", "Tarun", "Gaurav",
  "Alia", "Tara", "Kiara", "Avni", "Zara", "Trisha", "Maya", "Nisha", "Simran", "Deepika",
  "Pranav", "Nikhil", "Varun", "Harsh", "Akash", "Gautam", "Rajesh", "Sunil", "Vivek", "Anil"
];

const REAL_LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Mehta", "Iyer", "Nair", "Rao", "Reddy", "Deshmukh", "Joshi",
  "Kulkarni", "Chopra", "Malhotra", "Bhatia", "Kapoor", "Singhal", "Gupta", "Aggarwal", "Mishra", "Pandey",
  "Mukherjee", "Banerjee", "Chatterjee", "Sen", "Bose", "Ghosh", "Das", "Dutta", "Roy", "Chowdhury",
  "Menon", "Pillai", "Nambiar", "Shetty", "Hegde", "Kamath", "Pai", "Prabhu", "Naik", "Gowda"
];

const DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "icloud.com"];

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("------------------------------------------------------------------");
  console.log("CONNECTING DIRECTLY TO LIVE SUPABASE DATABASE...");
  console.log("Target Database: aws-1-ap-southeast-1.pooler.supabase.com:6543");
  console.log("------------------------------------------------------------------");

  const plans = await prisma.plan.findMany();
  const goldPlan = plans.find((p) => p.name.toUpperCase().includes("GOLD")) || plans[0];
  const silverPlan = plans.find((p) => p.name.toUpperCase().includes("SILVER")) || plans[1] || plans[0];
  const juniorPlan = plans.find((p) => p.name.toUpperCase().includes("JUNIOR")) || plans[2] || plans[0];

  const courts = await prisma.court.findMany({ where: { archivedAt: null } });
  const products = await prisma.product.findMany({ where: { archivedAt: null } });
  const barItems = await prisma.barItem.findMany({ where: { archivedAt: null } });
  const barTables = await prisma.barTable.findMany();
  const staff = await prisma.user.findFirst({ where: { role: "STAFF" } });
  const staffId = staff?.id || null;

  const sampleAccount = await prisma.account.findFirst();
  const defaultPassword = sampleAccount?.password || "35eaad10cb066fb65a123";

  const initialMemberCount = await prisma.member.count();
  console.log(`Current existing members in Supabase: ${initialMemberCount}`);

  // Plan distribution for 200 real users:
  // 70 Gold members, 60 Silver members, 30 Junior (Verified), 20 Junior (Unverified / Pending), 20 Free / Expired
  const planDistribution: Array<{
    type: "GOLD" | "SILVER" | "JUNIOR_VERIFIED" | "JUNIOR_UNVERIFIED" | "NO_PLAN";
  }> = [];

  for (let i = 0; i < 70; i++) planDistribution.push({ type: "GOLD" });
  for (let i = 0; i < 60; i++) planDistribution.push({ type: "SILVER" });
  for (let i = 0; i < 30; i++) planDistribution.push({ type: "JUNIOR_VERIFIED" });
  for (let i = 0; i < 20; i++) planDistribution.push({ type: "JUNIOR_UNVERIFIED" });
  for (let i = 0; i < 20; i++) planDistribution.push({ type: "NO_PLAN" });

  // Shuffle distribution
  for (let i = planDistribution.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [planDistribution[i], planDistribution[j]] = [planDistribution[j], planDistribution[i]];
  }

  const createdMembers: Array<{
    id: string;
    membershipNo: string;
    name: string;
    planType: string;
    isVerified: boolean;
    discountPct: number;
  }> = [];

  const now = new Date();
  console.log(`Inserting 200 members into Supabase...`);

  for (let i = 0; i < 200; i++) {
    const item = planDistribution[i];
    const seq = initialMemberCount + i + 1;
    const membershipNo = `CC-2026-${String(seq).padStart(3, "0")}`;
    const qrToken = `QR-CC-${String(seq).padStart(3, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const firstName = getRandom(REAL_FIRST_NAMES);
    const lastName = getRandom(REAL_LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const emailNum = getRandomInt(10, 999);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailNum}@${getRandom(DOMAINS)}`;

    let dateOfBirth: Date;
    let ageVerifiedAt: Date | null = null;
    let ageVerifiedById: string | null = null;
    let ageDocType: "SCHOOL_ID" | "AADHAAR" | "BIRTH_CERTIFICATE" | null = null;
    let discountPct = 0;

    if (item.type === "JUNIOR_VERIFIED") {
      const age = getRandomInt(11, 17);
      dateOfBirth = new Date(now.getFullYear() - age, getRandomInt(0, 11), getRandomInt(1, 28));
      ageVerifiedAt = new Date(now.getTime() - getRandomInt(2, 25) * 24 * 3600 * 1000);
      ageVerifiedById = staffId;
      ageDocType = getRandom(["SCHOOL_ID", "AADHAAR", "BIRTH_CERTIFICATE"] as const);
      discountPct = Number(juniorPlan.shopDiscountPct);
    } else if (item.type === "JUNIOR_UNVERIFIED") {
      const age = getRandomInt(12, 17);
      dateOfBirth = new Date(now.getFullYear() - age, getRandomInt(0, 11), getRandomInt(1, 28));
      ageVerifiedAt = null;
      ageVerifiedById = null;
      ageDocType = null;
      discountPct = 0; // Unverified Junior has 0% discounts until verified!
    } else {
      const age = getRandomInt(22, 54);
      dateOfBirth = new Date(now.getFullYear() - age, getRandomInt(0, 11), getRandomInt(1, 28));
      if (item.type === "GOLD") discountPct = Number(goldPlan.shopDiscountPct);
      else if (item.type === "SILVER") discountPct = Number(silverPlan.shopDiscountPct);
    }

    // 1. Create User
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: "MEMBER",
        emailVerified: true,
      },
    });

    // 2. Create Account
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: defaultPassword,
      },
    });

    // 3. Create Member
    const member = await prisma.member.create({
      data: {
        userId: user.id,
        membershipNo,
        qrToken,
        dateOfBirth,
        ageVerifiedAt,
        ageVerifiedById,
        ageDocType,
      },
    });

    // 4. Create Membership if applicable
    let planToUse = null;
    if (item.type === "GOLD") planToUse = goldPlan;
    else if (item.type === "SILVER") planToUse = silverPlan;
    else if (item.type === "JUNIOR_VERIFIED" || item.type === "JUNIOR_UNVERIFIED") planToUse = juniorPlan;

    if (planToUse) {
      const startsAt = new Date(now.getTime() - getRandomInt(5, 50) * 24 * 3600 * 1000);
      const endsAt = new Date(startsAt.getTime() + planToUse.durationDays * 24 * 3600 * 1000);

      const membership = await prisma.membership.create({
        data: {
          memberId: member.id,
          planId: planToUse.id,
          startsAt,
          endsAt,
          pricePaid: planToUse.price,
        },
      });

      // Write Ledger entries for membership
      await prisma.ledgerEntry.create({
        data: {
          source: "MEMBERSHIP",
          amount: planToUse.price,
          method: getRandom(["ONLINE", "UPI", "CARD"] as const),
          kind: "COLLECTED",
          refType: "MEMBERSHIP",
          refId: membership.id,
          createdAt: startsAt,
        },
      });

      await prisma.ledgerEntry.create({
        data: {
          source: "MEMBERSHIP",
          amount: planToUse.price,
          method: "ONLINE",
          kind: "EARNED",
          refType: "MEMBERSHIP",
          refId: membership.id,
          createdAt: startsAt,
        },
      });
    }

    createdMembers.push({
      id: member.id,
      membershipNo: member.membershipNo,
      name,
      planType: item.type,
      isVerified: Boolean(ageVerifiedAt),
      discountPct,
    });

    if ((i + 1) % 50 === 0) {
      console.log(`Inserted ${i + 1}/200 members into Supabase...`);
    }
  }

  // ========================================================
  // COURT BOOKINGS ACTIVITY
  // ========================================================
  console.log("Generating Court Bookings for Supabase members...");

  const existingBookings = await prisma.booking.findMany({
    select: { courtId: true, startsAt: true },
  });
  const bookedSlots = new Set<string>();
  for (const b of existingBookings) {
    bookedSlots.add(`${b.courtId}:${b.startsAt.getTime()}`);
  }

  let bookingCount = 0;
  const eligibleMembersForBooking = createdMembers.filter((m) => m.planType !== "NO_PLAN");

  for (let dayOffset = -14; dayOffset <= 5; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    targetDate.setMinutes(0, 0, 0);

    const availableHours = [7, 8, 9, 16, 17, 18, 19];
    for (const court of courts) {
      for (const hr of availableHours) {
        if (Math.random() < 0.28 && bookingCount < 90) {
          const slotStart = new Date(targetDate);
          slotStart.setHours(hr, 0, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
          const slotKey = `${court.id}:${slotStart.getTime()}`;

          if (!bookedSlots.has(slotKey)) {
            bookedSlots.add(slotKey);
            const member = getRandom(eligibleMembersForBooking);
            const basePrice = court.sport === "TENNIS" ? 800 : court.sport === "PADEL" ? 1000 : 500;
            const discountSnapshot = (basePrice * member.discountPct) / 100;
            const finalPrice = Math.max(0, basePrice - discountSnapshot);

            const booking = await prisma.booking.create({
              data: {
                courtId: court.id,
                memberId: member.id,
                startsAt: slotStart,
                endsAt: slotEnd,
                status: "CONFIRMED",
                kind: "NORMAL",
                priceSnapshot: basePrice,
                discountSnapshot,
                createdAt: new Date(slotStart.getTime() - 2 * 24 * 3600 * 1000),
              },
            });

            if (finalPrice > 0) {
              await prisma.ledgerEntry.create({
                data: {
                  source: "COURT",
                  amount: finalPrice,
                  method: getRandom(["UPI", "CARD"] as const),
                  kind: "COLLECTED",
                  refType: "BOOKING",
                  refId: booking.id,
                  createdAt: booking.createdAt,
                },
              });
            }

            bookingCount++;
          }
        }
      }
    }
  }

  console.log(`Created ${bookingCount} Court Bookings in Supabase.`);

  // ========================================================
  // PRO SHOP ORDERS ACTIVITY
  // ========================================================
  console.log("Generating Pro Shop purchases in Supabase...");

  let shopOrderCount = 0;
  if (products.length > 0) {
    for (let i = 0; i < 75; i++) {
      const member = getRandom(createdMembers);
      const orderDate = new Date(now.getTime() - getRandomInt(1, 30) * 24 * 3600 * 1000);
      const isOnline = Math.random() > 0.4;
      const isDelivery = isOnline && Math.random() > 0.5;

      const orderItemCount = getRandomInt(1, 3);
      const selectedProducts: typeof products = [];
      for (let j = 0; j < orderItemCount; j++) {
        selectedProducts.push(getRandom(products));
      }

      let subtotal = 0;
      for (const p of selectedProducts) {
        subtotal += Number(p.price);
      }
      const discount = (subtotal * member.discountPct) / 100;
      const netTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

      const shopOrder = await prisma.shopOrder.create({
        data: {
          memberId: member.id,
          channel: isOnline ? "ONLINE" : "COUNTER",
          fulfilment: isDelivery ? "DELIVERY" : "PICKUP",
          deliveryAddress: isDelivery ? `Villa ${getRandomInt(10, 250)}, Palm Meadows Club` : null,
          status: "DELIVERED",
          totalAmount: netTotal,
          paymentMethod: getRandom(["UPI", "CARD", "CASH"] as const),
          createdAt: orderDate,
          items: {
            create: selectedProducts.map((p) => {
              const itemDiscount = (Number(p.price) * member.discountPct) / 100;
              return {
                productId: p.id,
                quantity: 1,
                priceSnapshot: p.price,
                discountSnapshot: itemDiscount,
                createdAt: orderDate,
              };
            }),
          },
        },
      });

      if (netTotal > 0) {
        await prisma.ledgerEntry.create({
          data: {
            source: "SHOP",
            amount: netTotal,
            method: shopOrder.paymentMethod,
            kind: "COLLECTED",
            refType: "SHOP_ORDER",
            refId: shopOrder.id,
            createdAt: orderDate,
          },
        });
        await prisma.ledgerEntry.create({
          data: {
            source: "SHOP",
            amount: netTotal,
            method: shopOrder.paymentMethod,
            kind: "EARNED",
            refType: "SHOP_ORDER",
            refId: shopOrder.id,
            createdAt: orderDate,
          },
        });
      }

      shopOrderCount++;
    }
  }

  console.log(`Created ${shopOrderCount} Pro Shop orders in Supabase.`);

  // ========================================================
  // BAR / F&B ORDERS ACTIVITY
  // ========================================================
  console.log("Generating Bar / F&B tabs in Supabase...");

  let barTabCount = 0;
  if (barItems.length > 0 && barTables.length > 0) {
    for (let i = 0; i < 50; i++) {
      const member = getRandom(createdMembers);
      const tabDate = new Date(now.getTime() - getRandomInt(1, 25) * 24 * 3600 * 1000);
      const table = getRandom(barTables);

      const itemsInOrder = [getRandom(barItems), getRandom(barItems)];
      let subtotal = 0;
      for (const it of itemsInOrder) {
        subtotal += Number(it.price);
      }
      const discount = (subtotal * member.discountPct) / 100;
      const netTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

      const tab = await prisma.tab.create({
        data: {
          memberId: member.id,
          tableId: table.id,
          status: "CLOSED",
          totalAmount: netTotal,
          openedAt: tabDate,
          closedAt: new Date(tabDate.getTime() + 45 * 60 * 1000),
          createdAt: tabDate,
          orders: {
            create: {
              status: "SERVED",
              totalAmount: netTotal,
              createdAt: tabDate,
              items: {
                create: itemsInOrder.map((it) => ({
                  barItemId: it.id,
                  quantity: 1,
                  priceSnapshot: it.price,
                  discountSnapshot: (Number(it.price) * member.discountPct) / 100,
                  createdAt: tabDate,
                })),
              },
            },
          },
        },
      });

      if (netTotal > 0) {
        await prisma.ledgerEntry.create({
          data: {
            source: "BAR",
            amount: netTotal,
            method: getRandom(["UPI", "CARD", "CASH"] as const),
            kind: "COLLECTED",
            refType: "TAB",
            refId: tab.id,
            createdAt: tabDate,
          },
        });
        await prisma.ledgerEntry.create({
          data: {
            source: "BAR",
            amount: netTotal,
            method: "CARD",
            kind: "EARNED",
            refType: "TAB",
            refId: tab.id,
            createdAt: tabDate,
          },
        });
      }

      barTabCount++;
    }
  }

  console.log(`Created ${barTabCount} Bar tabs in Supabase.`);

  const finalMemberCount = await prisma.member.count();
  console.log(`==================================================================`);
  console.log(`SUPABASE POPULATION COMPLETE!`);
  console.log(`Total members in Supabase: ${finalMemberCount}`);
  console.log(`==================================================================`);
}

main()
  .catch((e) => {
    console.error("Population error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
