import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";
import { isPlatformHost } from "@/lib/domain-shared";
import { BRANDING } from "@/config/branding";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // 1. Custom Domain Mapping & Routing
  // If this is NOT a platform host (e.g., luxevs.com instead of vehiclix.app)
  if (!isPlatformHost(host) && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    // A. System Route Protection on Custom Domains
    // Redirect /admin, /portal, /login to platform domain for security and consistency
    if (
      pathname.startsWith("/admin") || 
      pathname.startsWith("/portal") || 
      pathname === "/login" || 
      pathname === "/register" // platform registration vs dealer registration is a choice, keeping platform for now
    ) {
      const platformUrl = new URL(pathname, `https://${BRANDING.platformDomain}`);
      request.nextUrl.searchParams.forEach((value, key) => {
        platformUrl.searchParams.set(key, value);
      });
      return NextResponse.redirect(platformUrl);
    }

    // B. Resolve Domain to Slug
    try {
      const resolveUrl = new URL(`/api/org/resolve-domain?host=${encodeURIComponent(host)}`, request.url);
      const res = await fetch(resolveUrl);
      
      if (res.ok) {
        const { slug } = await res.json();
        if (slug) {
          // Rewrite to the slug-based route internally
          // luxevs.com/inventory -> vehiclix.app/lux-evs/inventory
          const rewriteUrl = new URL(`/${slug}${pathname}`, request.url);
          
          // Preserve all search params
          request.nextUrl.searchParams.forEach((value, key) => {
            rewriteUrl.searchParams.set(key, value);
          });

          return NextResponse.rewrite(rewriteUrl);
        }
      } else if (res.status === 404) {
        // Unknown or unverified domain - fail safely with a 404
        return new NextResponse("404 Not Found: Domain not recognized", { status: 404 });
      }
    } catch (err) {
      console.error("Domain resolution failed:", err);
      // Fall through to default behavior or return error
    }
  }

  // 2. Resolve Session (needed for both platform and custom domain rewrites)
  const sessionToken = request.cookies.get("evo_session")?.value;
  const session = await decrypt(sessionToken);

  // 3. Resolve Mock Identity (if enabled)
  const isMockAllowed = process.env.ALLOW_MOCK_AUTH === "true";
  const mockRole = isMockAllowed ? request.cookies.get("evo_mock_role")?.value : null;

  const role = session?.role || mockRole;

  // 0. Legacy Redirection: Resolve ?org=<id> to /[dealerSlug]
  const orgId = request.nextUrl.searchParams.get("org");
  if (orgId && !pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    try {
      // Internal API fetch to resolve slug from ID without direct DB access in middleware
      const resolveUrl = new URL(`/api/org/resolve-slug?id=${orgId}`, request.url);
      const res = await fetch(resolveUrl);
      
      if (res.ok) {
        const { slug } = await res.json();
        if (slug) {
          // Determine the new path based on the current path
          let newPathname = pathname;
          
          // Map root /?org= to /[slug]
          if (pathname === "/") {
            newPathname = `/${slug}`;
          } 
          // Map other legacy paths: /inventory?org= to /[slug]/inventory
          else if (pathname.startsWith("/inventory") || 
                   pathname === "/register" || 
                   pathname === "/request-vehicle" || 
                   pathname === "/about" || 
                   pathname === "/contact") {
            newPathname = `/${slug}${pathname}`;
          }
          
          if (newPathname !== pathname) {
            const redirectUrl = new URL(newPathname, request.url);
            // Preserve other searchParams except "org"
            request.nextUrl.searchParams.forEach((value, key) => {
              if (key !== "org") {
                redirectUrl.searchParams.set(key, value);
              }
            });
            
            return NextResponse.redirect(redirectUrl, { status: 307 }); // Temporary redirect for safety
          }
        }
      }
    } catch (err) {
      console.error("Middleware legacy redirection failed:", err);
      // Fall through to generic behavior if resolution fails
    }
  }

  // 4. Super Admin Route Protection: /super-admin/*
  if (pathname.startsWith("/super-admin")) {
    if (!role) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role !== "SUPER_ADMIN") {
      return new NextResponse("403 Forbidden: Super Admin access required", { status: 403 });
    }
  }

  // 5. Owner Route Protection: /admin/*
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

  // 5. Customer Route Protection: /portal/*
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

  // 6. 2FA Page Protection
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
  matcher: [
    "/admin/:path*", 
    "/portal/:path*", 
    "/super-admin/:path*",
    "/login/verify-2fa",
    "/",
    "/inventory/:path*",
    "/register",
    "/request-vehicle",
    "/about",
    "/contact"
  ],
};
