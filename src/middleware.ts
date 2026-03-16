import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";
import { isPlatformHost } from "@/lib/domain-shared";
import { BRANDING } from "@/config/branding";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // #region agent log
  const sessionToken = request.cookies.get("evo_session")?.value;
  const session = await decrypt(sessionToken);
  const isMockAllowed = process.env.ALLOW_MOCK_AUTH === "true";
  const mockRole = isMockAllowed ? request.cookies.get("evo_mock_role")?.value : null;
  const role = session?.role || mockRole;
  fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'middleware.ts:entry',message:'middleware',data:{pathname,host,isPlatformHost:isPlatformHost(host),hasSessionToken:!!sessionToken,role:role ?? null,isTwoFactorVerified:session?.isTwoFactorVerified ?? null,supportOrgId:session?.supportOrgId ?? null},timestamp:Date.now(),hypothesisId:'A,B,C,D'})}).catch(()=>{});
  // #endregion

  // 1. Custom Domain Mapping & Routing
  // If this is NOT a platform host (e.g., luxevs.com instead of vehiclix.app)
  if (!isPlatformHost(host) && !pathname.startsWith("/api") && !pathname.startsWith("/_next") && !pathname.startsWith("/static")) {
    // A. System Route Protection on Custom Domains
    // Redirect /admin, /portal, /login to platform domain for security and consistency
    if (
      pathname.startsWith("/admin") || 
      pathname.startsWith("/portal") || 
      pathname === "/login" || 
      pathname === "/register" // platform registration vs dealer registration is a choice, keeping platform for now
    ) {
      // Don't redirect if we're already on the platform domain but isPlatformHost failed
      const normalizedHost = host.split(":")[0].toLowerCase();
      const platformDomain = BRANDING.platformDomain.toLowerCase();
      
      if (normalizedHost === platformDomain || normalizedHost.endsWith("." + platformDomain)) {
        // Redundant redirect avoided
      } else {
        const platformUrl = new URL(pathname, `https://${BRANDING.platformDomain}`);
        request.nextUrl.searchParams.forEach((value, key) => {
          platformUrl.searchParams.set(key, value);
        });
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'middleware.ts:platformRedirect',message:'redirect to platform',data:{pathname,host,destination:platformUrl.toString(),reason:'custom_domain_admin_to_platform'},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        return NextResponse.redirect(platformUrl);
      }
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

  // 2. Resolve Session (already resolved at top for logging)
  // 3. Resolve Mock Identity (if enabled)

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
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'middleware.ts:legacy307',message:'307 legacy org redirect',data:{pathname,newPathname,destination:redirectUrl.toString(),reason:'legacy_org'},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
            // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'middleware.ts:adminNoRole',message:'redirect',data:{pathname,destination:loginUrl.toString(),reason:'admin_no_role'},timestamp:Date.now(),hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      return NextResponse.redirect(loginUrl);
    }

    // Support Mode check: Allow SUPER_ADMIN only if supportOrgId is active
    const isSupportMode = role === "SUPER_ADMIN" && session?.supportOrgId;
    
    if (role !== "OWNER" && !isSupportMode) {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'middleware.ts:admin403',message:'403',data:{pathname,role,reason:'admin_not_owner_nor_support'},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return new NextResponse("403 Forbidden: Owner or Support access required", { status: 403 });
    }

    // New: Check if 2FA is verified (Owners require 2FA, Support Mode bypasses it as SUPER_ADMIN already has their own session)
    if (role === "OWNER" && session && !session.isTwoFactorVerified) {
      const verifyUrl = new URL("/login/verify-2fa", request.url);
      verifyUrl.searchParams.set("from", pathname);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'middleware.ts:admin2FA',message:'redirect to 2fa',data:{pathname,destination:verifyUrl.toString(),reason:'admin_owner_2fa_not_verified'},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return NextResponse.redirect(verifyUrl);
    }
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'middleware.ts:adminAllow',message:'admin allowed next()',data:{pathname,role},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
      const from = request.nextUrl.searchParams.get("from") || "/admin";
      const dest = new URL(from, request.url);
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/329925ab-9b1c-4864-8917-f8b91cf631b6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6598c'},body:JSON.stringify({sessionId:'b6598c',location:'middleware.ts:verify2faRedirect',message:'redirect from verify-2fa',data:{from,destination:dest.toString(),reason:'2fa_verified'},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return NextResponse.redirect(dest);
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
