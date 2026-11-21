import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export const POST = async (req: NextRequest) => {
  const url = new URL(req.url);
  // Block public registration endpoints completely
  if (url.pathname.endsWith("/sign-up/email") || url.pathname.includes("/sign-up")) {
    return NextResponse.json(
      { message: "Public registration is disabled. Member accounts are registered exclusively by club staff." },
      { status: 403 }
    );
  }
  return handlers.POST(req);
};
