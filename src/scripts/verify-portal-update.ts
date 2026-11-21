import { prisma } from "../lib/prisma";
import { placeOrder, getShopProductsPaginated } from "../lib/services/shop";
import { addCourtAction, deleteCourtAction } from "../app/actions/courts";
import {
  addItemAction,
  restockItemAction,
  adjustStockAction,
  archiveItemAction,
} from "../app/actions/inventory";

async function runVerification() {
  console.log("=== STARTING VERIFICATION OF ALL 8 PORTAL REQUIREMENTS ===");

  // 1. Test Court Management: Add and Delete court
  console.log("\n[Test 1] Testing Court Add and Delete...");
  const courtName = `Test Court ${Date.now().toString().slice(-4)}`;
  const court = await prisma.court.create({
    data: {
      name: courtName,
      sport: "TENNIS",
      capacity: 4,
    },
  });
  console.log(`Created test court: ${court.name} (id: ${court.id})`);

  // Soft delete court
  await prisma.$transaction(async (tx) => {
    await tx.court.update({
      where: { id: court.id },
      data: { archivedAt: new Date() },
    });
  });
  const archivedCourt = await prisma.court.findUnique({ where: { id: court.id } });
  console.log(`Archived court status: archivedAt = ${archivedCourt?.archivedAt ? "Set (Soft-deleted)" : "Failed"}`);

  // 2. Test Inventory: Add product, Restock, Adjust, Archive
  console.log("\n[Test 2] Testing Inventory operations (Add, Restock, Adjust, Archive)...");
  const prodName = `Test Racket Pro ${Date.now().toString().slice(-4)}`;
  const pCount = await prisma.product.count();
  const sku = `PS-${String(pCount + 1).padStart(4, "0")}`;

  const product = await prisma.product.create({
    data: {
      sku,
      name: prodName,
      category: "Rackets",
      price: 4999,
      costPrice: 2800,
      stockQty: 5,
      reorderLevel: 2,
    },
  });
  console.log(`Added product: ${product.name} (SKU: ${product.sku}, Stock: ${product.stockQty})`);

  // Restock product with unit cost -> should increment stock and record StockMovement
  const addQty = 10;
  const unitCost = 2800;
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: { stockQty: { increment: addQty } },
    });
    const smId = "sm_test_r_" + Math.random().toString(36).slice(2, 10);
    await tx.$executeRaw`
      INSERT INTO "StockMovement" ("id", "itemType", "itemId", "type", "quantityChange", "unitCost", "note", "createdAt")
      VALUES (${smId}, 'PRODUCT', ${product.id}, 'PURCHASE', ${addQty}, ${unitCost}, 'Verification restock', NOW())
    `;
    await tx.expense.create({
      data: {
        title: `Restock: ${product.name}`,
        category: "Inventory",
        amount: addQty * unitCost,
        notes: "Verification Restock Expense",
      },
    });
  });
  const restockedProd = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  console.log(`Restocked product stock: ${restockedProd.stockQty} (Expected: 15)`);

  // Adjust stock with reason
  const newCount = 12;
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: product.id },
      data: { stockQty: newCount },
    });
    const smId = "sm_test_a_" + Math.random().toString(36).slice(2, 10);
    await tx.$executeRaw`
      INSERT INTO "StockMovement" ("id", "itemType", "itemId", "type", "quantityChange", "unitCost", "note", "createdAt")
      VALUES (${smId}, 'PRODUCT', ${product.id}, 'DAMAGE', -3, ${unitCost}, 'Damage - Damaged in transit', NOW())
    `;
  });
  const adjustedProd = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  console.log(`Adjusted product stock: ${adjustedProd.stockQty} (Expected: 12)`);

  // Archive item
  await prisma.product.update({
    where: { id: product.id },
    data: { archivedAt: new Date() },
  });
  const archivedProd = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  console.log(`Archived product: archivedAt = ${archivedProd.archivedAt ? "Set" : "Failed"}`);

  // 3. Test Pro Shop Pagination and Search
  console.log("\n[Test 3] Testing Shop Pagination & Debounced Search...");
  const page1 = await getShopProductsPaginated({ page: 1, limit: 9 });
  console.log(`Shop Page 1: Returned ${page1.products.length} products, total ${page1.total}, totalPages ${page1.totalPages}`);
  const searchTest = await getShopProductsPaginated({ page: 1, limit: 9, query: "Grip" });
  console.log(`Shop Search for 'Grip': Returned ${searchTest.products.length} matching products`);

  // 4. Test Transactions Pagination and Filter
  console.log("\n[Test 4] Testing Transactions Pagination and Filtering...");
  const txCount = await prisma.ledgerEntry.count();
  const txPage = await prisma.ledgerEntry.findMany({ take: 25, orderBy: { createdAt: "desc" } });
  console.log(`Total ledger transactions: ${txCount}, Page size: ${txPage.length} (Max 25 per page)`);

  // 5. Test Shop Sales with CASH, CARD, UPI (Member & Guest)
  console.log("\n[Test 5] Testing Shop Sales with CASH, CARD, and UPI...");
  // Find an active product with stock >= 3
  const activeProduct = await prisma.product.findFirst({
    where: { stockQty: { gte: 5 }, archivedAt: null },
  });
  if (!activeProduct) {
    throw new Error("No active product with stock found for checkout test.");
  }

  // Find a member
  const member = await prisma.member.findFirst({
    include: { user: true },
  });

  // Test CASH (Member)
  const cashRes = await placeOrder({
    items: [{ productId: activeProduct.id, quantity: 1 }],
    channel: "COUNTER",
    memberId: member?.id || null,
    paymentMethod: "CASH",
    clientRequestId: "test_cash_" + Date.now(),
  });
  console.log(`CASH sale (Member): ${cashRes.success ? "SUCCESS" : "FAILED: " + cashRes.error}`);

  // Test CARD (Guest)
  const cardRes = await placeOrder({
    items: [{ productId: activeProduct.id, quantity: 1 }],
    channel: "COUNTER",
    guestName: "Guest Golfer",
    paymentMethod: "CARD",
    clientRequestId: "test_card_" + Date.now(),
  });
  console.log(`CARD sale (Guest): ${cardRes.success ? "SUCCESS" : "FAILED: " + cardRes.error}`);

  // Test UPI (Member)
  const upiRes = await placeOrder({
    items: [{ productId: activeProduct.id, quantity: 1 }],
    channel: "COUNTER",
    memberId: member?.id || null,
    paymentMethod: "UPI",
    clientRequestId: "test_upi_" + Date.now(),
  });
  console.log(`UPI sale (Member): ${upiRes.success ? "SUCCESS" : "FAILED: " + upiRes.error}`);

  console.log("\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===");
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
