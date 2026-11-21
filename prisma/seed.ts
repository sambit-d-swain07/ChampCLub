import { PrismaClient, Role, BookingStatus, BookingKind, ShopChannel, ShopFulfilment, ShopOrderStatus, TabStatus, BarOrderStatus, LeadStatus, LedgerSource, PaymentMethod, LedgerKind } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/chamclub?schema=public";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding The Champions Club database...");

  // 1. Clean up existing data in reverse order of foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.barOrderItem.deleteMany();
  await prisma.barOrder.deleteMany();
  await prisma.tab.deleteMany();
  await prisma.barTable.deleteMany();
  await prisma.barItem.deleteMany();
  await prisma.shopOrderItem.deleteMany();
  await prisma.shopOrder.deleteMany();
  await prisma.product.deleteMany();
  await prisma.bookingParticipant.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.court.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.member.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const defaultHashedPassword = await hashPassword("password123");

  // Helper to create Better Auth user + account
  async function createUser(name: string, email: string, role: Role) {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        role: role.toString(),
      },
    });

    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: defaultHashedPassword,
      },
    });

    return user;
  }

  // 2. Create Owner & Staff Users
  const ownerUser = await createUser("Vikramaditya Singhania (Owner)", "owner@chamclub.com", Role.OWNER);
  const staff1 = await createUser("Arjun Mehta (Desk)", "staff1@chamclub.com", Role.STAFF);
  const staff2 = await createUser("Neha Patel (Bar)", "staff2@chamclub.com", Role.STAFF);
  const staff3 = await createUser("Rohan Gupta (Shop)", "staff3@chamclub.com", Role.STAFF);

  console.log("Created owner and staff users.");

  // 3. Create Plans
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

  const plans = [goldPlan, silverPlan, juniorPlan];
  console.log("Created membership plans.");

  // 4. Create Courts
  const courts = await Promise.all([
    prisma.court.create({ data: { name: "Tennis Court 1 (Championship)", sport: "TENNIS", capacity: 4 } }),
    prisma.court.create({ data: { name: "Tennis Court 2 (Grandstand)", sport: "TENNIS", capacity: 4 } }),
    prisma.court.create({ data: { name: "Padel Court 1 (Panoramic)", sport: "PADEL", capacity: 4 } }),
    prisma.court.create({ data: { name: "Padel Court 2 (Pro Court)", sport: "PADEL", capacity: 4 } }),
    prisma.court.create({ data: { name: "Badminton Court 1 (Teakwood)", sport: "BADMINTON", capacity: 4 } }),
    prisma.court.create({ data: { name: "Badminton Court 2 (Synthetic)", sport: "BADMINTON", capacity: 4 } }),
  ]);

  // Pricing rules
  await Promise.all([
    prisma.pricingRule.create({ data: { sport: "TENNIS", basePrice: 1200 } }),
    prisma.pricingRule.create({ data: { sport: "PADEL", basePrice: 1500 } }),
    prisma.pricingRule.create({ data: { sport: "BADMINTON", basePrice: 800 } }),
  ]);
  console.log("Created courts and pricing rules.");

  // 5. Create 20 Members across plans
  const memberNames = [
    "Dev Anand", "Rohit Sharma", "Sania Mirza", "Leander Paes", "Mahesh Bhupathi",
    "Rohan Bopanna", "P.V. Sindhu", "Saina Nehwal", "Prakash Padukone", "Kidambi Srikanth",
    "Ashwini Ponnappa", "Chirag Shetty", "Satwiksairaj Rankireddy", "Somdev Devvarman", "Ankita Raina",
    "Yuki Bhambri", "Prajnesh Gunneswaran", "Sumit Nagal", "Karman Kaur Thandi", "Rutuja Bhosale"
  ];

  const now = new Date();
  const members = [];

  for (let i = 0; i < memberNames.length; i++) {
    const idx = i + 1;
    const user = await createUser(memberNames[i], `member${idx}@chamclub.com`, Role.MEMBER);
    const member = await prisma.member.create({
      data: {
        userId: user.id,
        membershipNo: `CC-2026-${String(idx).padStart(3, "0")}`,
        qrToken: `QR-CC-${String(idx).padStart(3, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      },
    });

    // Plan selection: 0-7 GOLD, 8-15 SILVER, 16-19 JUNIOR
    const plan = idx <= 8 ? goldPlan : (idx <= 16 ? silverPlan : juniorPlan);
    
    // Dates: member 19 is expired (-380 to -15 days), member 1 & 2 expire soon (+5 and +9 days), others active
    let startsAt = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    let endsAt = new Date(now.getTime() + (plan.durationDays - 60) * 24 * 60 * 60 * 1000);

    if (idx === 19) {
      // Expired
      startsAt = new Date(now.getTime() - 380 * 24 * 60 * 60 * 1000);
      endsAt = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    } else if (idx === 1) {
      // Expiring in 5 days
      startsAt = new Date(now.getTime() - 360 * 24 * 60 * 60 * 1000);
      endsAt = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    } else if (idx === 2) {
      // Expiring in 9 days
      startsAt = new Date(now.getTime() - 356 * 24 * 60 * 60 * 1000);
      endsAt = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000);
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

    // Ledger for membership purchase
    await prisma.ledgerEntry.create({
      data: {
        source: LedgerSource.MEMBERSHIP,
        amount: plan.price,
        method: PaymentMethod.UPI,
        kind: LedgerKind.COLLECTED,
        refType: "MEMBERSHIP",
        refId: membership.id,
        createdAt: startsAt,
      },
    });

    members.push({ member, user, plan });
  }

  console.log("Created 20 members with memberships and ledger entries.");

  // 6. Create 25 Products
  const products = await Promise.all([
    prisma.product.create({ data: { name: "Wilson Pro Staff 97 v14", category: "Rackets", price: 18500, stockQty: 12, reorderLevel: 3 } }),
    prisma.product.create({ data: { name: "Babolat Pure Aero 2024", category: "Rackets", price: 17200, stockQty: 15, reorderLevel: 4 } }),
    prisma.product.create({ data: { name: "Head Speed MP Legend", category: "Rackets", price: 16800, stockQty: 10, reorderLevel: 3 } }),
    prisma.product.create({ data: { name: "Bullpadel Hack 03 Pro Padel", category: "Rackets", price: 22000, stockQty: 8, reorderLevel: 2 } }),
    prisma.product.create({ data: { name: "Babolat Technical Viper Padel", category: "Rackets", price: 24500, stockQty: 6, reorderLevel: 2 } }),
    prisma.product.create({ data: { name: "Yonex Astrox 99 Pro Badminton", category: "Rackets", price: 14200, stockQty: 18, reorderLevel: 5 } }),
    prisma.product.create({ data: { name: "Li-Ning Aeronaut 9000", category: "Rackets", price: 13500, stockQty: 14, reorderLevel: 4 } }),
    prisma.product.create({ data: { name: "Wilson US Open Tennis Balls (Can of 3)", category: "Balls", price: 450, stockQty: 120, reorderLevel: 25 } }),
    prisma.product.create({ data: { name: "Dunlop Fort All Court (Can of 3)", category: "Balls", price: 480, stockQty: 95, reorderLevel: 20 } }),
    prisma.product.create({ data: { name: "Head Padel Pro S (Can of 3)", category: "Balls", price: 550, stockQty: 80, reorderLevel: 20 } }),
    prisma.product.create({ data: { name: "Yonex Aerosensa 50 Shuttles", category: "Balls", price: 1850, stockQty: 45, reorderLevel: 15 } }),
    prisma.product.create({ data: { name: "Yonex Mavis 350 Nylon Shuttles (6s)", category: "Balls", price: 750, stockQty: 90, reorderLevel: 25 } }),
    prisma.product.create({ data: { name: "Champions Club Tech Polo Shirt", category: "Apparel", price: 1499, stockQty: 35, reorderLevel: 10 } }),
    prisma.product.create({ data: { name: "Champions Club Performance Shorts", category: "Apparel", price: 1199, stockQty: 40, reorderLevel: 10 } }),
    prisma.product.create({ data: { name: "Nike Court Dri-FIT Wristband", category: "Accessories", price: 399, stockQty: 60, reorderLevel: 15 } }),
    prisma.product.create({ data: { name: "Tourna Grip Original (3 Pack)", category: "Accessories", price: 499, stockQty: 75, reorderLevel: 20 } }),
    prisma.product.create({ data: { name: "Yonex Super Grap Overgrip (3 Pack)", category: "Accessories", price: 450, stockQty: 85, reorderLevel: 25 } }),
    prisma.product.create({ data: { name: "Champions Club Hydro 750ml Bottle", category: "Accessories", price: 899, stockQty: 50, reorderLevel: 12 } }),
    prisma.product.create({ data: { name: "Asics Gel Resolution 9 Shoes", category: "Footwear", price: 11999, stockQty: 14, reorderLevel: 4 } }),
    prisma.product.create({ data: { name: "Nike Court Zoom Vapor 11", category: "Footwear", price: 12995, stockQty: 10, reorderLevel: 3 } }),
    prisma.product.create({ data: { name: "Yonex Power Cushion 65 Z3", category: "Footwear", price: 9990, stockQty: 16, reorderLevel: 4 } }),
    prisma.product.create({ data: { name: "Champions Club 6-Racket Tour Bag", category: "Accessories", price: 3499, stockQty: 12, reorderLevel: 3 } }),
    prisma.product.create({ data: { name: "Wilson Custom Dampener Duo", category: "Accessories", price: 299, stockQty: 90, reorderLevel: 20 } }),
    prisma.product.create({ data: { name: "Champions Club Microfibre Towel", category: "Accessories", price: 599, stockQty: 65, reorderLevel: 15 } }),
    prisma.product.create({ data: { name: "Champions Club Performance Cap", category: "Apparel", price: 699, stockQty: 50, reorderLevel: 12 } }),
  ]);
  console.log("Created 25 shop products.");

  // 7. Create 20 Bar Items
  const barItems = await Promise.all([
    prisma.barItem.create({ data: { name: "Double Espresso", category: "Coffee", price: 180, stockQty: 200, reorderLevel: 30 } }),
    prisma.barItem.create({ data: { name: "Iced Americano", category: "Coffee", price: 220, stockQty: 180, reorderLevel: 30 } }),
    prisma.barItem.create({ data: { name: "Artisanal Cappuccino", category: "Coffee", price: 240, stockQty: 190, reorderLevel: 30 } }),
    prisma.barItem.create({ data: { name: "Isolate Whey Protein Shake (Choc)", category: "Fitness", price: 320, stockQty: 100, reorderLevel: 20 } }),
    prisma.barItem.create({ data: { name: "Berry Antioxidant Protein Blast", category: "Fitness", price: 340, stockQty: 90, reorderLevel: 20 } }),
    prisma.barItem.create({ data: { name: "Fresh Tender Coconut Water", category: "Juices", price: 120, stockQty: 80, reorderLevel: 25 } }),
    prisma.barItem.create({ data: { name: "Cold-Pressed Green Detox Juice", category: "Juices", price: 250, stockQty: 60, reorderLevel: 15 } }),
    prisma.barItem.create({ data: { name: "Red Bull Energy Drink (250ml)", category: "Energy", price: 195, stockQty: 120, reorderLevel: 24 } }),
    prisma.barItem.create({ data: { name: "Gatorade Electrolyte 500ml", category: "Energy", price: 90, stockQty: 140, reorderLevel: 30 } }),
    prisma.barItem.create({ data: { name: "Grilled Chicken & Avocado Wrap", category: "Food", price: 380, stockQty: 40, reorderLevel: 10 } }),
    prisma.barItem.create({ data: { name: "Smoked Paneer Multigrain Toastie", category: "Food", price: 290, stockQty: 45, reorderLevel: 10 } }),
    prisma.barItem.create({ data: { name: "Roasted Mediterranean Quinoa Bowl", category: "Food", price: 350, stockQty: 35, reorderLevel: 10 } }),
    prisma.barItem.create({ data: { name: "Greek Feta & Kalamata Salad", category: "Food", price: 320, stockQty: 30, reorderLevel: 10 } }),
    prisma.barItem.create({ data: { name: "Club Champion Smashed Burger", category: "Food", price: 450, stockQty: 35, reorderLevel: 10 } }),
    prisma.barItem.create({ data: { name: "Parmesan Truffle Fries", category: "Snacks", price: 240, stockQty: 80, reorderLevel: 20 } }),
    prisma.barItem.create({ data: { name: "Organic Hummus with Warm Pita", category: "Snacks", price: 280, stockQty: 50, reorderLevel: 15 } }),
    prisma.barItem.create({ data: { name: "Corona Extra Pint", category: "Alcohol", price: 380, stockQty: 90, reorderLevel: 24 } }),
    prisma.barItem.create({ data: { name: "Bira 91 White Draft Pint", category: "Alcohol", price: 290, stockQty: 110, reorderLevel: 30 } }),
    prisma.barItem.create({ data: { name: "Champions Classic Mint Mojito", category: "Cocktails", price: 320, stockQty: 70, reorderLevel: 15 } }),
    prisma.barItem.create({ data: { name: "Passionfruit Fizz Mocktail", category: "Mocktails", price: 260, stockQty: 80, reorderLevel: 15 } }),
  ]);
  console.log("Created 20 bar items.");

  // 8. Create 8 Bar Tables
  const barTables = await Promise.all([
    prisma.barTable.create({ data: { name: "Table 1 (Courtside Patio)", capacity: 4 } }),
    prisma.barTable.create({ data: { name: "Table 2 (Courtside Patio)", capacity: 4 } }),
    prisma.barTable.create({ data: { name: "Table 3 (Lounge Deck)", capacity: 6 } }),
    prisma.barTable.create({ data: { name: "Table 4 (Lounge Deck)", capacity: 6 } }),
    prisma.barTable.create({ data: { name: "Table 5 (Central Bar)", capacity: 4 } }),
    prisma.barTable.create({ data: { name: "Table 6 (Central Bar)", capacity: 4 } }),
    prisma.barTable.create({ data: { name: "Table 7 (VIP Cabana)", capacity: 8 } }),
    prisma.barTable.create({ data: { name: "Table 8 (Garden Terrace)", capacity: 4 } }),
  ]);
  console.log("Created 8 bar tables.");

  // 9. Past 30 Days Bookings across courts with Snapshotted Prices & Discounts
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const bookingDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    // 2-3 bookings per day
    const bookingsCount = (dayOffset % 2 === 0) ? 3 : 2;

    for (let b = 0; b < bookingsCount; b++) {
      const court = courts[(dayOffset + b) % courts.length];
      const memberObj = members[(dayOffset * 2 + b) % members.length];
      const hour = 7 + (b * 4); // 7:00, 11:00, 15:00
      
      const startsAt = new Date(bookingDate);
      startsAt.setHours(hour, 0, 0, 0);
      const endsAt = new Date(bookingDate);
      endsAt.setHours(hour + 1, 30, 0, 0); // 1.5 hours

      const basePrice = court.sport === "PADEL" ? 1500 : (court.sport === "TENNIS" ? 1200 : 800);
      const discountPct = Number(memberObj.plan.courtDiscountPct);
      const discount = (basePrice * discountPct) / 100;
      const finalPrice = basePrice - discount;

      const booking = await prisma.booking.create({
        data: {
          courtId: court.id,
          memberId: memberObj.member.id,
          startsAt,
          endsAt,
          status: dayOffset === 0 && b === 0 ? BookingStatus.CONFIRMED : BookingStatus.CONFIRMED,
          kind: BookingKind.NORMAL,
          priceSnapshot: basePrice,
          discountSnapshot: discount,
          createdAt: new Date(startsAt.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
      });

      // Participant
      await prisma.bookingParticipant.create({
        data: {
          bookingId: booking.id,
          memberId: memberObj.member.id,
        },
      });

      // Ledger entry for court booking
      await prisma.ledgerEntry.create({
        data: {
          source: LedgerSource.COURT,
          amount: finalPrice,
          method: PaymentMethod.UPI,
          kind: LedgerKind.COLLECTED,
          refType: "BOOKING",
          refId: booking.id,
          createdAt: booking.createdAt,
        },
      });
    }
  }
  console.log("Created 30 days of court bookings & court ledger entries.");

  // 10. Past 30 Days Shop Orders
  for (let dayOffset = 28; dayOffset >= 0; dayOffset -= 2) {
    const orderDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const memberObj = members[dayOffset % members.length];
    const prod1 = products[(dayOffset) % products.length];
    const prod2 = products[(dayOffset + 5) % products.length];

    const discPct = Number(memberObj.plan.shopDiscountPct);
    const p1Disc = (Number(prod1.price) * discPct) / 100;
    const p2Disc = (Number(prod2.price) * discPct) / 100;
    const total = (Number(prod1.price) - p1Disc) + (Number(prod2.price) - p2Disc) * 2;

    const order = await prisma.shopOrder.create({
      data: {
        memberId: memberObj.member.id,
        channel: dayOffset % 4 === 0 ? ShopChannel.ONLINE : ShopChannel.COUNTER,
        fulfilment: ShopFulfilment.PICKUP,
        status: ShopOrderStatus.COMPLETED,
        totalAmount: total,
        createdAt: orderDate,
        items: {
          create: [
            {
              productId: prod1.id,
              quantity: 1,
              priceSnapshot: prod1.price,
              discountSnapshot: p1Disc,
            },
            {
              productId: prod2.id,
              quantity: 2,
              priceSnapshot: prod2.price,
              discountSnapshot: p2Disc,
            },
          ],
        },
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        source: LedgerSource.SHOP,
        amount: total,
        method: PaymentMethod.CARD,
        kind: LedgerKind.COLLECTED,
        refType: "SHOP_ORDER",
        refId: order.id,
        createdAt: orderDate,
      },
    });
  }
  console.log("Created past shop orders & ledger entries.");

  // 11. Past 30 Days Tabs & Bar Orders
  for (let dayOffset = 27; dayOffset >= 0; dayOffset -= 2) {
    const barDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    const memberObj = members[(dayOffset + 3) % members.length];
    const table = barTables[dayOffset % barTables.length];
    const item1 = barItems[dayOffset % barItems.length];
    const item2 = barItems[(dayOffset + 7) % barItems.length];

    const barDiscPct = Number(memberObj.plan.barDiscountPct);
    const b1Disc = (Number(item1.price) * barDiscPct) / 100;
    const b2Disc = (Number(item2.price) * barDiscPct) / 100;
    const total = (Number(item1.price) - b1Disc) * 2 + (Number(item2.price) - b2Disc);

    const tab = await prisma.tab.create({
      data: {
        memberId: memberObj.member.id,
        tableId: table.id,
        status: TabStatus.CLOSED,
        totalAmount: total,
        openedAt: barDate,
        closedAt: new Date(barDate.getTime() + 2 * 60 * 60 * 1000),
      },
    });

    const barOrder = await prisma.barOrder.create({
      data: {
        tabId: tab.id,
        status: BarOrderStatus.SERVED,
        personLabel: memberObj.user.name,
        totalAmount: total,
        createdAt: barDate,
        items: {
          create: [
            {
              barItemId: item1.id,
              quantity: 2,
              priceSnapshot: item1.price,
              discountSnapshot: b1Disc,
            },
            {
              barItemId: item2.id,
              quantity: 1,
              priceSnapshot: item2.price,
              discountSnapshot: b2Disc,
            },
          ],
        },
      },
    });

    await prisma.ledgerEntry.create({
      data: {
        source: LedgerSource.BAR,
        amount: total,
        method: PaymentMethod.UPI,
        kind: LedgerKind.COLLECTED,
        refType: "TAB",
        refId: tab.id,
        createdAt: new Date(barDate.getTime() + 2 * 60 * 60 * 1000),
      },
    });
  }
  console.log("Created past bar tabs & ledger entries.");

  // 12. Expenses over past 30 days
  const expensesData = [
    { title: "Court Resurfacing & Line Paint", category: "Maintenance", amount: 45000, daysAgo: 28 },
    { title: "Electricity & Floodlights Bill", category: "Utilities", amount: 32000, daysAgo: 25 },
    { title: "Wilson & Head Pro Stock Restock", category: "Inventory", amount: 85000, daysAgo: 22 },
    { title: "Bar Fresh Produce & Beverage Supplies", category: "F&B Supplies", amount: 28000, daysAgo: 18 },
    { title: "Badminton Court Net Replacement & Grips", category: "Equipment", amount: 12500, daysAgo: 15 },
    { title: "Staff Monthly Salaries Advance", category: "Payroll", amount: 95000, daysAgo: 10 },
    { title: "Club House Wi-Fi & Software Subscriptions", category: "Technology", amount: 6500, daysAgo: 5 },
    { title: "Plumbing & Shower Area Sanitization", category: "Maintenance", amount: 8000, daysAgo: 2 },
  ];

  for (const exp of expensesData) {
    await prisma.expense.create({
      data: {
        title: exp.title,
        category: exp.category,
        amount: exp.amount,
        recordedBy: ownerUser.name,
        date: new Date(now.getTime() - exp.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log("Created expenses.");

  // 13. Leads CRM Data
  const leadsData = [
    { name: "Ananya Deshmukh", email: "ananya.d@gmail.com", phone: "+91 98201 11223", source: "Instagram", status: LeadStatus.NEW, followUpAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) },
    { name: "Kabir Sen", email: "kabir.sen@outlook.com", phone: "+91 98112 33445", source: "Walk-in", status: LeadStatus.CONTACTED, followUpAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) },
    { name: "TCS Sports Council", email: "sports@tcs.com", phone: "+91 98450 55667", source: "Corporate", status: LeadStatus.QUOTE_SENT, followUpAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) },
    { name: "Tanvi Narang", email: "tanvi.n@yahoo.com", phone: "+91 98765 43210", source: "Referral", status: LeadStatus.CONVERTED, followUpAt: null },
    { name: "Suresh Menon", email: "suresh.m@gmail.com", phone: "+91 97123 45678", source: "Website", status: LeadStatus.LOST, followUpAt: null },
    { name: "Rishabh Bajaj", email: "rishabh.b@gmail.com", phone: "+91 99887 76655", source: "Walk-in", status: LeadStatus.NEW, followUpAt: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000) },
  ];

  for (const lead of leadsData) {
    await prisma.lead.create({
      data: {
        ...lead,
        assignedTo: staff1.name,
      },
    });
  }
  console.log("Created leads.");

  // 14. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { actorId: ownerUser.id, action: "SYSTEM_INITIALIZE", entityType: "SYSTEM", details: { message: "The Champions Club system initialized" } },
      { actorId: staff1.id, action: "MEMBER_CHECKIN", entityType: "MEMBER", entityId: members[0].member.id, details: { court: "Court 1" } },
      { actorId: staff2.id, action: "TAB_CLOSED", entityType: "TAB", details: { table: "Table 1" } },
      { actorId: staff3.id, action: "INVENTORY_RESTOCK", entityType: "PRODUCT", details: { category: "Balls" } },
    ],
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
