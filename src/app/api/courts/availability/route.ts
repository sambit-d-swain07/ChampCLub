import { NextRequest, NextResponse } from "next/server";
import { getCourtAvailability, formatKolkataDate } from "@/lib/services/booking";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || formatKolkataDate(new Date());

    // Validate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    let mode: "admin" | "member" = "member";
    let memberId: string | undefined = undefined;

    if (user?.role === "OWNER" || user?.role === "STAFF") {
      mode = "admin";
    } else if (user) {
      mode = "member";
      const member = await prisma.member.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      memberId = member?.id;
    }

    const availability = await getCourtAvailability(dateParam, { mode, memberId });

    return NextResponse.json(availability, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
