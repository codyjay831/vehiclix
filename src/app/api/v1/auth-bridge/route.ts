/**
 * GET /api/v1/auth-bridge
 *
 * Redirect-based login handoff for Website Integration API v1.
 * Redirects into the existing /login flow with a safe return path.
 * No password auth, no session issuance, no new auth surface.
 */

import { NextRequest, NextResponse } from "next/server";
import { sanitizeReturnPath } from "@/lib/api/auth-bridge-utils";
import { getPublicOriginForRedirect } from "@/lib/request-public-origin";

/**
 * Redirects to login with optional safe from param.
 * On invalid returnUrl, redirects to login without from (user gets default post-login redirect).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const returnUrl = url.searchParams.get("returnUrl") ?? url.searchParams.get("from");

  const sanitized = sanitizeReturnPath(returnUrl);

  const loginUrl = new URL("/login", getPublicOriginForRedirect(request));
  if (sanitized) {
    loginUrl.searchParams.set("from", sanitized);
  }

  return NextResponse.redirect(loginUrl, 302);
}
