import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Mock cookie logic
  const mockRole = request.cookies.get("evo_mock_role")?.value;

  // 1. Owner Route Protection: /admin/*
  if (pathname.startsWith("/admin")) {
    if (!mockRole) {
      // Anonymous -> Protected: redirect to /login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (mockRole !== "OWNER") {
      // Wrong role (e.g. CUSTOMER) -> Forbidden
      return new NextResponse("403 Forbidden: Owner access required", { status: 403 });
    }
  }

  // 2. Customer Route Protection: /portal/*
  if (pathname.startsWith("/portal")) {
    if (!mockRole) {
      // Anonymous -> Protected: redirect to /login
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Config matcher: only run on routes starting with /admin and /portal
export const config = {
  matcher: ["/admin/:path*", "/portal/:path*"],
};
