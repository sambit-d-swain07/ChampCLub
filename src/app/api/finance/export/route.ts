import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveFinanceRange } from "@/lib/services/finance";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const role = (user as { role?: string })?.role || "MEMBER";

  if (!user || role !== "OWNER") {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") || "month";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const filter = resolveFinanceRange(range, from, to);

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      createdAt: {
        gte: filter.start,
        lte: filter.end,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = ["ID", "Timestamp (IST)", "Source", "Kind", "Payment Method", "Amount (INR)", "Reference Type", "Reference ID"].join(",");
  const rows = entries.map((e) => {
    const istTime = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "short",
      timeStyle: "medium",
    }).format(e.createdAt);

    return [
      `"${e.id}"`,
      `"${istTime}"`,
      `"${e.source}"`,
      `"${e.kind}"`,
      `"${e.method}"`,
      Number(e.amount).toFixed(2),
      `"${e.refType}"`,
      `"${e.refId}"`,
    ].join(",");
  });

  const csv = [header, ...rows].join("\r\n");

  const filename = `ledger-export-${filter.rangeType}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
