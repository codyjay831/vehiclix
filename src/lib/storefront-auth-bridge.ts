/**
 * Storefront Phase 5: login entry via GET /api/v1/auth-bridge (Website Integration API v1).
 * Only safe relative paths are passed; server-side sanitizeReturnPath is the final authority.
 */
export function storefrontAuthBridgeHref(returnPath?: string | null): string {
  if (
    typeof returnPath === "string" &&
    returnPath.startsWith("/") &&
    !returnPath.startsWith("//") &&
    !returnPath.includes("://")
  ) {
    return `/api/v1/auth-bridge?returnUrl=${encodeURIComponent(returnPath)}`;
  }
  return "/api/v1/auth-bridge";
}
