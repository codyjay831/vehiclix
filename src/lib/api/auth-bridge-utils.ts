/**
 * Utilities for auth-bridge safe redirect handling.
 * Prevents open redirect; only allows same-origin paths.
 */

const MAX_PATH_LENGTH = 500;
const SAFE_PATH_REGEX = /^\/[a-zA-Z0-9/_-]*$/;

/**
 * Validates and sanitizes a return path for post-login redirect.
 * Only allows relative paths (same-origin); rejects absolute URLs, protocol-relative, or risky strings.
 *
 * @returns Sanitized path if valid, null if invalid
 */
export function sanitizeReturnPath(input: string | null | undefined): string | null {
  if (input == null || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_PATH_LENGTH) return null;
  if (!SAFE_PATH_REGEX.test(trimmed)) return null;
  // Reject protocol-relative or double-slash bypass attempts
  if (trimmed.includes("//")) return null;
  if (trimmed.startsWith("//")) return null;
  return trimmed;
}
