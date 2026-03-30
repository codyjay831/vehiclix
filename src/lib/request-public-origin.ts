import type { NextRequest } from "next/server";

function isUnusableRedirectHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "0.0.0.0" || h === "::" || h === "[::]";
}

/**
 * Base URL for absolute redirects sent to the browser (middleware / route handlers).
 * On platforms like Firebase App Hosting, `request.url` may reflect the container bind
 * address (e.g. 0.0.0.0:8080) rather than the public site URL.
 */
export function getPublicOriginForRedirect(request: NextRequest): string {
  // NEW: Check if the request is coming from a local host first.
  // This avoids redirects to production when environment variables (like APP_URL)
  // are pulled from a live environment into a local .env file.
  const hostHeader =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.split(",")[0]?.trim();
  const hostOnly = hostHeader?.split(":")[0] ?? "";
  const isLocal =
    hostOnly === "localhost" ||
    hostOnly === "127.0.0.1" ||
    hostOnly.endsWith(".localhost");

  if (isLocal && hostHeader) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
    return `${proto}://${hostHeader}`;
  }

  const fromEnv =
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const rawHost = hostHeader;
  const hostname = hostOnly;
  if (rawHost && hostname && !isUnusableRedirectHost(hostname)) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      (hostname === "localhost" || hostname === "127.0.0.1" ? "http" : "https");
    return `${proto}://${rawHost}`;
  }

  const next = request.nextUrl.origin;
  if (next && !next.includes("0.0.0.0")) return next;

  try {
    const u = new URL(request.url);
    if (u.hostname && !isUnusableRedirectHost(u.hostname)) return u.origin;
  } catch {
    /* ignore */
  }

  return "http://localhost:3000";
}
