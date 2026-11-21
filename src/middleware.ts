import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin and /member routes with zero-db cookie check
  if (pathname.startsWith("/admin") || pathname.startsWith("/member")) {
    const allCookies = request.cookies.getAll();
    const hasAuthCookie = allCookies.some(
      (c) =>
        c.name.includes("session") ||
        c.name.includes("better-auth") ||
        c.name.includes("auth")
    );

    // Only redirect if completely unauthenticated with no auth/session cookies
    if (!hasAuthCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/member/:path*"],
};
