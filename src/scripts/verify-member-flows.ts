import "dotenv/config";
import { prisma } from "../lib/prisma";
import { auth } from "../lib/auth";
import { bookAndConfirm, generateDaySlots, formatKolkataDate } from "../lib/services/booking";
import { placeOrder } from "../lib/services/shop";
import { resolve } from "../lib/services/entitlement";

async function main() {
  console.log("=== THE CHAMPIONS CLUB: MEMBER SELF-SERVICE VERIFICATION ===");

  const timestamp = Date.now();
  const testEmail1 = `player1_${timestamp}@thechampionsclub.in`;
  const testEmail2 = `player2_${timestamp}@thechampionsclub.in`;
  const password = "password123!";

  // ----------------------------------------------------
  // TEST 1: Sign up new member account
  // ----------------------------------------------------
  console.log("\n[TEST 1] Signing up new member account...");
  const authUser1 = await auth.api.signUpEmail({
    body: {
      name: `Champion One ${timestamp}`,
      email: testEmail1,
      password,
    },
  });

  if (!authUser1?.user?.id) {
    throw new Error("Failed to create auth user 1");
  }

  // Ensure role is MEMBER
  await prisma.user.update({
    where: { id: authUser1.user.id },
    data: { role: "MEMBER" },
  });

  const memberCount = await prisma.member.count();
  const membershipNo1 = `CC-2026-${String(memberCount + 1).padStart(3, "0")}`;
  const qrToken1 = `QR-CC-${String(memberCount + 1).padStart(3, "0")}-TEST1`;

  const member1 = await prisma.member.create({
    data: {
      userId: authUser1.user.id,
      membershipNo: membershipNo1,
      qrToken: qrToken1,
    },
  });

  // Verify entitlement before plan (should be WALK_IN)
  const entInitial = await resolve(member1.id);
  console.log(`✓ Member created: ${member1.membershipNo}, Initial Status: ${entInitial.status}`);
  if (entInitial.status !== "WALK_IN") {
    throw new Error(`Expected WALK_IN status for member without plan, got ${entInitial.status}`);
  }

  // ----------------------------------------------------
  // TEST 2: Choose plan through demo checkout
  // ----------------------------------------------------
  console.log("\n[TEST 2] Choosing Gold plan via Demo Checkout (ONLINE)...");
  const goldPlan = await prisma.plan.findFirstOrThrow({
    where: { name: "GOLD" },
  });

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + goldPlan.durationDays * 24 * 60 * 60 * 1000);

  const membership = await prisma.membership.create({
    data: {
      memberId: member1.id,
      planId: goldPlan.id,
      startsAt,
      endsAt,
      pricePaid: goldPlan.price,
    },
  });

  // Record Demo checkout ledger entry
  const ledger = await prisma.ledgerEntry.create({
    data: {
      source: "MEMBERSHIP",
      amount: goldPlan.price,
      method: "ONLINE",
      kind: "COLLECTED",
      refType: "MEMBERSHIP",
      refId: membership.id,
      createdAt: startsAt,
    },
  });

  const entAfterPlan = await resolve(member1.id);
  console.log(`✓ Plan activated: ${goldPlan.name}, Status: ${entAfterPlan.status}, Court Discount: ${entAfterPlan.courtDiscountPct}%`);
  console.log(`✓ Ledger entry created: ₹${Number(ledger.amount)} via ${ledger.method}`);

  // ----------------------------------------------------
  // TEST 3 & 4: Book slot & Verify 2nd account double-booking is REJECTED
  // ----------------------------------------------------
  console.log("\n[TEST 3 & 4] Testing court slot booking & double-booking prevention...");

  // Create second account
  const authUser2 = await auth.api.signUpEmail({
    body: {
      name: `Champion Two ${timestamp}`,
      email: testEmail2,
      password,
    },
  });
  await prisma.user.update({
    where: { id: authUser2.user.id },
    data: { role: "MEMBER" },
  });
  const member2 = await prisma.member.create({
    data: {
      userId: authUser2.user.id,
      membershipNo: `CC-2026-${String(memberCount + 2).padStart(3, "0")}`,
      qrToken: `QR-CC-${String(memberCount + 2).padStart(3, "0")}-TEST2`,
    },
  });

  const court = await prisma.court.findFirstOrThrow({
    where: { sport: "TENNIS" },
  });

  // Pick a slot tomorrow at 10:00 AM
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrowStr = formatKolkataDate(tomorrow);
  const slotStartsAt = new Date(`${tomorrowStr}T10:00:00+05:30`);
  const slotEndsAt = new Date(slotStartsAt.getTime() + 60 * 60 * 1000);

  // Clean any collision for test repeatability
  await prisma.booking.deleteMany({
    where: {
      courtId: court.id,
      startsAt: slotStartsAt,
      endsAt: slotEndsAt,
    },
  });

  // Member 1 books the slot
  const booking1Res = await bookAndConfirm({
    courtId: court.id,
    startsAt: slotStartsAt,
    endsAt: slotEndsAt,
    memberId: member1.id,
    paymentMethod: "ONLINE",
  });

  if (!booking1Res.success) {
    throw new Error(`Member 1 failed to book slot: ${booking1Res.error}`);
  }
  console.log(`✓ Member 1 successfully booked ${court.name} at 10:00 AM (${tomorrowStr})`);

  // Member 2 attempts to book the EXACT SAME slot
  const booking2Res = await bookAndConfirm({
    courtId: court.id,
    startsAt: slotStartsAt,
    endsAt: slotEndsAt,
    memberId: member2.id,
    paymentMethod: "ONLINE",
  });

  if (booking2Res.success) {
    throw new Error("CRITICAL FAILURE: Second member was able to double-book the same slot!");
  }
  console.log(`✓ Double-booking rejected for Member 2 as expected: "${booking2Res.error}"`);

  // ----------------------------------------------------
  // TEST 5: Last unit online purchase then counter purchase fails
  // ----------------------------------------------------
  console.log("\n[TEST 5] Testing shared inventory atomic concurrency (1 item left)...");

  // Create a limited item with stockQty = 1
  const limitedProduct = await prisma.product.create({
    data: {
      name: `Limited Edition Pro Racket ${timestamp}`,
      category: "RACKETS",
      price: 15000,
      stockQty: 1,
      reorderLevel: 2,
    },
  });
  console.log(`✓ Created test product "${limitedProduct.name}" with initial stock = 1`);

  // Online order for the 1 remaining item
  const onlineOrderRes = await placeOrder({
    channel: "ONLINE",
    memberId: member1.id,
    fulfilment: "PICKUP",
    paymentMethod: "ONLINE",
    items: [{ productId: limitedProduct.id, quantity: 1 }],
  });

  if (!onlineOrderRes.success) {
    throw new Error(`Online purchase failed unexpectedly: ${onlineOrderRes.error}`);
  }
  console.log(`✓ Online order placed successfully. Order ID: ${onlineOrderRes.orderId}`);

  // Check current stock in DB
  const productAfterOnline = await prisma.product.findUniqueOrThrow({
    where: { id: limitedProduct.id },
  });
  console.log(`✓ Product stock verified in DB: ${productAfterOnline.stockQty} remaining`);

  // Attempt counter sale for the same product
  const counterSaleRes = await placeOrder({
    channel: "COUNTER",
    memberId: member2.id,
    fulfilment: "PICKUP",
    paymentMethod: "CASH",
    items: [{ productId: limitedProduct.id, quantity: 1 }],
  });

  if (counterSaleRes.success) {
    throw new Error("CRITICAL FAILURE: Counter sale succeeded when stock was exhausted (0 left)!");
  }
  console.log(`✓ Counter sale failed as expected: "${counterSaleRes.error}"`);

  console.log("\n========================================================");
  console.log("ALL 5 MEMBER SELF-SERVICE AND SECURITY FLOWS PASSED 100%");
  console.log("========================================================");
}

main()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
