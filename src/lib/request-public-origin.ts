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
  const fromEnv =
    process.env.APP_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const rawHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.split(",")[0]?.trim();
  const hostname = rawHost?.split(":")[0] ?? "";
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
