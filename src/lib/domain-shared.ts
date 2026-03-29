import { BRANDING } from "@/config/branding";

/**
 * Normalizes a hostname for lookup:
 * - lowercase
 * - strips port
 * - strips trailing dot
 * - strips leading www. (optional, but recommended for lookup consistency)
 */
export function normalizeHostname(host: string): string {
  return host
    .toLowerCase()
    .split(":")[0] // Strip port
    .replace(/\.$/, "") // Strip trailing dot
    .replace(/^www\./, ""); // Strip leading www.
}

/**
 * Checks if a hostname is a platform-owned host.
 */
export function isPlatformHost(host: string): boolean {
  const normalized = normalizeHostname(host);
  const platformDomain = normalizeHostname(BRANDING.platformDomain);

  if (
    normalized === platformDomain ||
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(`.${platformDomain}`)
  ) {
    return true;
  }

  // Vercel default / preview URLs (e.g. vehiclix.vercel.app) are not under platformDomain
  if (normalized.endsWith(".vercel.app")) {
    return true;
  }

  return false;
}
