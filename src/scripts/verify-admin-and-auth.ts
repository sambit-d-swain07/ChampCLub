import "dotenv/config";
import { prisma } from "../lib/prisma";
import { searchMembers, getPlans } from "../lib/services/members";
import { getPostLoginRedirectAction } from "../app/actions/members";
import { createWebsiteLeadAction } from "../app/actions/leads";
import { getCourtAvailability, formatKolkataDate } from "../lib/services/booking";
import { getOwnerFinancials, resolveFinanceRange } from "../lib/services/finance";
import { getDashboardMetrics } from "../lib/services/dashboard";

async function runVerification() {
  console.log("=================================================================");
  console.log("   THE CHAMPIONS CLUB: VERIFYING ADMIN PORTAL & AUTH STABILITY   ");
  console.log("=================================================================\n");

  // -------------------------------------------------------------
  // TEST 1: Stress test searchMembers() - 10 consecutive executions
  // -------------------------------------------------------------
  console.log("[TEST 1] Testing /admin/members loader 10 times consecutively (cold & warm)...");
  for (let i = 1; i <= 10; i++) {
    const start = Date.now();
    const result = await searchMembers("", 1, 20);
    const duration = Date.now() - start;
    if (!result || !Array.isArray(result.members)) {
      throw new Error(`Run #${i} failed to return members.`);
    }
    console.log(`  ✓ Run #${i}: Loaded ${result.members.length} members (total: ${result.total}, page: ${result.page}/${result.totalPages}) in ${duration}ms`);
  }
  console.log("✓ /admin/members loaded 10/10 times with zero connection errors or timeouts.\n");

  // -------------------------------------------------------------
  // TEST 2: Role-based redirect logic & ?redirect= support
  // -------------------------------------------------------------
  console.log("[TEST 2] Verifying login role redirects...");
  const ownerRedirect = await getPostLoginRedirectAction("owner@gmail.com");
  const staffRedirect = await getPostLoginRedirectAction("staff1@gmail.com");
  const memberRedirect = await getPostLoginRedirectAction("player1_1795259549083@thechampionsclub.in");
  const memberWithCustomRedirect = await getPostLoginRedirectAction(
    "player1_1795259549083@thechampionsclub.in",
    "/member/book"
  );

  console.log(`  ✓ OWNER redirect: ${ownerRedirect} (expected: /admin/owner)`);
  console.log(`  ✓ STAFF redirect: ${staffRedirect} (expected: /admin)`);
  console.log(`  ✓ MEMBER default redirect: ${memberRedirect} (expected: /member)`);
  console.log(`  ✓ MEMBER booking link redirect: ${memberWithCustomRedirect} (expected: /member/book)`);

  if (ownerRedirect !== "/admin/owner") throw new Error("Owner redirect mismatch");
  if (staffRedirect !== "/admin") throw new Error("Staff redirect mismatch");
  if (memberRedirect !== "/member") throw new Error("Member redirect mismatch");
  if (memberWithCustomRedirect !== "/member/book") throw new Error("Member custom redirect mismatch");
  console.log("✓ Login redirects verified for all roles.\n");

  // -------------------------------------------------------------
  // TEST 3: Website Contact Form creates Lead (source WEBSITE)
  // -------------------------------------------------------------
  console.log("[TEST 3] Testing website contact form -> Lead creation (source WEBSITE)...");
  const testContactForm = new FormData();
  testContactForm.set("name", "Mahesh Bhupathi");
  testContactForm.set("contact", "mahesh@bhupathi.com");
  testContactForm.set("sport", "TENNIS");
  testContactForm.set("message", "Inquiry about junior academy and court slots.");

  const leadResult = await createWebsiteLeadAction(testContactForm);
  if (!leadResult.success || !leadResult.leadId) {
    throw new Error(`Failed to create website lead: ${leadResult.error}`);
  }

  const savedLead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadResult.leadId },
  });

  console.log(`  ✓ Lead saved in DB: ID ${savedLead.id}`);
  console.log(`  ✓ Source: ${savedLead.source} (expected: WEBSITE)`);
  console.log(`  ✓ Status: ${savedLead.status} (expected: NEW)`);
  if (savedLead.source !== "WEBSITE" || savedLead.status !== "NEW") {
    throw new Error("Lead source/status verification failed");
  }
  console.log("✓ Website contact lead pipeline working cleanly.\n");

  // -------------------------------------------------------------
  // TEST 4: Verify Admin Portal Modules Load Cleanly
  // -------------------------------------------------------------
  console.log("[TEST 4] Testing all admin module services...");
  const todayStr = formatKolkataDate(new Date());

  const [metrics, courts, financials, plans] = await Promise.all([
    getDashboardMetrics(),
    getCourtAvailability(todayStr),
    getOwnerFinancials(resolveFinanceRange("this-month")),
    getPlans(),
  ]);

  console.log(`  ✓ Dashboard Overview: ${metrics.memberCount} members, ₹${metrics.totalRevenue} revenue`);
  console.log(`  ✓ Courts & Availability: ${courts.courts.length} courts loaded for ${todayStr}`);
  console.log(`  ✓ Executive Finance: Earned ₹${financials.cards.earned}, Collected ₹${financials.cards.collected}`);
  console.log(`  ✓ Membership Plans: ${plans.length} plans available`);
  console.log("✓ All admin module services loaded without errors.\n");

  console.log("=================================================================");
  console.log("   ALL VERIFICATION CHECKS PASSED (100% SUCCESS)   ");
  console.log("=================================================================");
}

runVerification()
  .catch((e) => {
    console.error("Verification failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
