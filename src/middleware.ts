import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Resolve Session
  const sessionToken = request.cookies.get("evo_session")?.value;
  const session = await decrypt(sessionToken);

  // 2. Resolve Mock Identity (if enabled)
  const isMockAllowed = process.env.ALLOW_MOCK_AUTH === "true";
  const mockRole = isMockAllowed ? request.cookies.get("evo_mock_role")?.value : null;

  const role = session?.role || mockRole;

  // 3. Owner Route Protection: /admin/*
  if (pathname.startsWith("/admin")) {
    if (!role) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role !== "OWNER") {
      return new NextResponse("403 Forbidden: Owner access required", { status: 403 });
    }

    // New: Check if 2FA is verified for Owners
    if (session && !session.isTwoFactorVerified) {
      const verifyUrl = new URL("/login/verify-2fa", request.url);
      verifyUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(verifyUrl);
    }
  }

  // 4. Customer Route Protection: /portal/*
  if (pathname.startsWith("/portal")) {
    if (!role) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role !== "CUSTOMER") {
      return new NextResponse("403 Forbidden: Customer access required", { status: 403 });
    }
  }

  // 5. 2FA Page Protection
  if (pathname === "/login/verify-2fa") {
    if (!role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    if (session?.isTwoFactorVerified) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/login/verify-2fa"],
};
