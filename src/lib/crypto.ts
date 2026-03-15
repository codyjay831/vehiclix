import { createHash } from "crypto";

/**
 * Hashes a token using SHA-256.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
