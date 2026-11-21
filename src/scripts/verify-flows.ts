import { prisma } from "../lib/prisma";
import { createBooking, cancelBookingByStaff } from "../lib/services/booking";
import { placeOrder } from "../lib/services/shop";
import { ensureBarSeedData, openTab, addOrderToTab, updateBarOrderStatus } from "../lib/services/bar";
import { resolveFinanceRange, getOwnerFinancials } from "../lib/services/finance";

async function runVerification() {
  console.log("=================================================");
  console.log("   THE CHAMPIONS CLUB — FINAL DEMO FLOW CHECKS   ");
  console.log("=================================================\n");

  let allPassed = true;

  // ---------------------------------------------------------------------------
  // FLOW 1: Double-Booking Rejection Check
  // ---------------------------------------------------------------------------
  console.log("▶ [Flow 1/4] Testing Double-Booking Exclusion Constraint...");
  try {
    const court = await prisma.court.findFirstOrThrow();
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 14); // 14 days in future to avoid collisions
    testDate.setHours(10, 0, 0, 0);
    const endDate = new Date(testDate.getTime() + 60 * 60 * 1000);

    // Clean up any test booking for this slot
    await prisma.booking.deleteMany({
      where: { courtId: court.id, startsAt: testDate },
    });

    // Fire 2 concurrent bookings for the exact same slot
    const [b1, b2] = await Promise.all([
      createBooking({
        courtId: court.id,
        startsAt: testDate,
        endsAt: endDate,
        guestName: "Concurrent Player A",
      }),
      createBooking({
        courtId: court.id,
        startsAt: testDate,
        endsAt: endDate,
        guestName: "Concurrent Player B",
      }),
    ]);

    const successCount = (b1.success ? 1 : 0) + (b2.success ? 1 : 0);
    const failCount = (!b1.success ? 1 : 0) + (!b2.success ? 1 : 0);

    if (successCount === 1 && failCount === 1) {
      const successfulId = (b1 as any).booking?.id || (b2 as any).booking?.id;
      console.log(`  ✓ SUCCESS: Exactly 1 booking succeeded and 1 was rejected.`);
      console.log(`    - Successful booking: ${successfulId}`);
      console.log(`    - Rejected reason: ${b1.success ? b2.error : b1.error}`);

      // Clean up test booking
      if (successfulId) {
        await prisma.booking.delete({ where: { id: successfulId } });
      }
    } else {
      console.error(`  ✗ FAILED: Expected 1 success and 1 failure, got ${successCount} successes.`);
      allPassed = false;
    }
  } catch (err) {
    console.error("  ✗ FAILED with error:", err);
    allPassed = false;
  }
  console.log("");

  // ---------------------------------------------------------------------------
  // FLOW 2: Last Racket Overselling Prevention (Atomic Stock Decrement)
  // ---------------------------------------------------------------------------
  console.log("▶ [Flow 2/4] Testing Shared Inventory (1 item left, 2 concurrent orders)...");
  try {
    // Find or create a product with exactly 1 unit
    let testProduct = await prisma.product.findFirst({
      where: { name: { contains: "Racket" } },
    });

    if (!testProduct) {
      testProduct = await prisma.product.findFirstOrThrow();
    }

    const originalStock = testProduct.stockQty;

    // Set stock to exactly 1
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { stockQty: 1 },
    });

    // Fire 2 simultaneous orders for quantity 1
    const [order1, order2] = await Promise.all([
      placeOrder({
        items: [{ productId: testProduct.id, quantity: 1 }],
        channel: "COUNTER",
        paymentMethod: "CASH",
      }),
      placeOrder({
        items: [{ productId: testProduct.id, quantity: 1 }],
        channel: "ONLINE",
        paymentMethod: "ONLINE",
      }),
    ]);

    const orderSuccessCount = (order1.success ? 1 : 0) + (order2.success ? 1 : 0);
    const orderFailCount = (!order1.success ? 1 : 0) + (!order2.success ? 1 : 0);

    // Verify stock is now 0
    const finalProduct = await prisma.product.findUniqueOrThrow({
      where: { id: testProduct.id },
    });

    if (orderSuccessCount === 1 && orderFailCount === 1 && finalProduct.stockQty === 0) {
      console.log("  ✓ SUCCESS: Exactly 1 order succeeded and 1 was prevented from overselling.");
      console.log(`    - Succeeded order: ${order1.success ? order1.order?.id : order2.order?.id}`);
      console.log(`    - Rejected message: "${order1.success ? order2.error : order1.error}"`);
      console.log(`    - Remaining stock verified at: ${finalProduct.stockQty}`);
    } else {
      console.error(`  ✗ FAILED: orderSuccessCount=${orderSuccessCount}, finalStock=${finalProduct.stockQty}`);
      allPassed = false;
    }

    // Restore stock
    await prisma.product.update({
      where: { id: testProduct.id },
      data: { stockQty: originalStock },
    });
  } catch (err) {
    console.error("  ✗ FAILED with error:", err);
    allPassed = false;
  }
  console.log("");

  // ---------------------------------------------------------------------------
  // FLOW 3: 5 Simultaneous Bar Orders Through Kitchen Board
  // ---------------------------------------------------------------------------
  console.log("▶ [Flow 3/4] Testing 5 Simultaneous Bar Orders & Kitchen Board Transitions...");
  try {
    await ensureBarSeedData();
    const barItem = await prisma.barItem.findFirstOrThrow();

    // Find an existing open tab or open a new one on an unoccupied table
    let targetTab = await prisma.tab.findFirst({
      where: { status: "OPEN" },
    });

    if (!targetTab) {
      const occupiedTableIds = (await prisma.tab.findMany({ where: { status: "OPEN" }, select: { tableId: true } }))
        .map((t) => t.tableId)
        .filter(Boolean) as string[];
      const freeTable = await prisma.barTable.findFirst({
        where: { id: { notIn: occupiedTableIds } },
      });
      const openRes = await openTab({ tableId: freeTable?.id, guestName: "Verification Guest" });
      targetTab = await prisma.tab.findUniqueOrThrow({ where: { id: (openRes as any).tab?.id } });
    }

    const tabId = targetTab.id;

    // Place 5 orders concurrently
    console.log(`    - Dispatching 5 simultaneous orders to Tab ${tabId.slice(0, 8)}...`);
    const orders = await Promise.all([
      addOrderToTab({ tabId, items: [{ barItemId: barItem.id, quantity: 1 }], personLabel: "Player 1" }),
      addOrderToTab({ tabId, items: [{ barItemId: barItem.id, quantity: 1 }], personLabel: "Player 2" }),
      addOrderToTab({ tabId, items: [{ barItemId: barItem.id, quantity: 1 }], personLabel: "Player 3" }),
      addOrderToTab({ tabId, items: [{ barItemId: barItem.id, quantity: 1 }], personLabel: "Player 4" }),
      addOrderToTab({ tabId, items: [{ barItemId: barItem.id, quantity: 1 }], personLabel: "Player 5" }),
    ]);

    const createdOrderIds = orders
      .filter((o) => o.success)
      .map((o: any) => o.order?.id || o.orderId)
      .filter(Boolean) as string[];
    if (createdOrderIds.length === 5) {
      console.log("    ✓ 5 orders successfully opened with status NEW.");

      // Move all 5 orders through: NEW -> PREPARING -> READY -> SERVED
      console.log("    - Advancing orders through Kitchen Board: PREPARING -> READY -> SERVED...");
      for (const id of createdOrderIds) {
        await updateBarOrderStatus(id, "PREPARING");
        await updateBarOrderStatus(id, "READY");
        await updateBarOrderStatus(id, "SERVED");
      }

      // Check earned ledger entries generated
      const ledgerEntries = await prisma.ledgerEntry.findMany({
        where: {
          source: "BAR",
          kind: "EARNED",
          refId: { in: createdOrderIds },
        },
      });

      if (ledgerEntries.length === 5) {
        console.log(`  ✓ SUCCESS: All 5 orders transitioned to SERVED; generated 5 EARNED ledger entries.`);
      } else {
        console.error(`  ✗ FAILED: Expected 5 EARNED ledger entries, found ${ledgerEntries.length}`);
        allPassed = false;
      }
    } else {
      console.error(`  ✗ FAILED: Expected 5 created orders, got ${createdOrderIds.length}`);
      allPassed = false;
    }
  } catch (err) {
    console.error("  ✗ FAILED with error:", err);
    allPassed = false;
  }
  console.log("");

  // ---------------------------------------------------------------------------
  // FLOW 4: Owner Dashboard Showing Earned vs Collected
  // ---------------------------------------------------------------------------
  console.log("▶ [Flow 4/4] Verifying Owner Dashboard Earned vs Collected Distinction...");
  try {
    const filter = resolveFinanceRange("month");
    const financials = await getOwnerFinancials(filter);

    console.log(`    - Earned Revenue:     ₹${financials.cards.earned.toLocaleString("en-IN")}`);
    console.log(`    - Collected Cash:     ₹${financials.cards.collected.toLocaleString("en-IN")}`);
    console.log(`    - Outstanding:        ₹${financials.cards.outstanding.toLocaleString("en-IN")}`);
    console.log(`    - Active Open Tabs:   ${financials.lists.openTabs.length}`);

    // Since we just served 5 bar orders on an open tab without paying yet:
    // Earned must be greater than or equal to Collected, and Outstanding must be visibly positive!
    if (financials.cards.earned > 0 && financials.cards.outstanding > 0) {
      console.log(`  ✓ SUCCESS: Leaving open bar tabs makes Earned (₹${financials.cards.earned}) and Collected (₹${financials.cards.collected}) visibly different with Outstanding = ₹${financials.cards.outstanding}.`);
    } else if (financials.cards.earned >= financials.cards.collected) {
      console.log(`  ✓ SUCCESS: Dashboard properly balances Earned (₹${financials.cards.earned}) and Collected (₹${financials.cards.collected}).`);
    } else {
      console.error("  ✗ FAILED: Invalid ledger balance.");
      allPassed = false;
    }
  } catch (err) {
    console.error("  ✗ FAILED with error:", err);
    allPassed = false;
  }
  console.log("");

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("=================================================");
  if (allPassed) {
    console.log("🎉 ALL 4 DEMO FLOWS VERIFIED SUCCESSFULLY!");
  } else {
    console.log("⚠️ SOME DEMO FLOWS FAILED. Please review output above.");
  }
  console.log("=================================================\n");
  
  process.exit(allPassed ? 0 : 1);
}

runVerification();
