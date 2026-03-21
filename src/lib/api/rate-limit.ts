/**
 * In-memory sliding-window rate limiting for API v1 public write routes.
 *
 * - No Redis; suitable for single-node or best-effort per instance in serverless.
 * - Keys should include endpoint namespace so leads vs reservations are separate buckets.
 */

import { NextResponse } from "next/server";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** When blocked, ms until the oldest counted request exits the window */
  retryAfterMs?: number;
};

const buckets = new Map<string, number[]>();

/** Amortized cleanup of empty or stale keys to limit memory growth */
let pruneCounter = 0;
const PRUNE_EVERY = 200;
const MAX_KEYS_SOFT = 8000;

function pruneGlobalStale(maxWindowMs: number): void {
  const cutoff = Date.now() - maxWindowMs;
  for (const [key, ts] of buckets) {
    const kept = ts.filter((t) => t > cutoff);
    if (kept.length === 0) buckets.delete(key);
    else buckets.set(key, kept);
  }
}

/**
 * Fixed sliding window: count requests in [now - windowMs, now].
 * If under limit, records this request and allows.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;
  let timestamps = buckets.get(key) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const oldest = Math.min(...timestamps);
    const retryAfterMs = Math.max(0, oldest + windowMs - now);
    buckets.set(key, timestamps);
    return {
      allowed: false,
      remaining: 0,
      limit,
      retryAfterMs,
    };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);

  pruneCounter++;
  if (pruneCounter >= PRUNE_EVERY) {
    pruneCounter = 0;
    pruneGlobalStale(windowMs);
    if (buckets.size > MAX_KEYS_SOFT) {
      pruneGlobalStale(windowMs * 2);
    }
  }

  return {
    allowed: true,
    remaining: limit - timestamps.length,
    limit,
  };
}

/**
 * Best-effort client IP for rate limiting (behind proxies).
 * Prefer first address in X-Forwarded-For; never trust for auth — limits only.
 */
export function getClientIpForRateLimit(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first && first.length <= 45) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && realIp.length <= 45) return realIp;

  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf && cf.length <= 45) return cf;

  return "unknown";
}

/** Website Integration API v1 — public leads POST */
export const V1_PUBLIC_LEADS_LIMIT = 8;
export const V1_PUBLIC_LEADS_WINDOW_MS = 60_000;

/** Website Integration API v1 — public reservations POST (stricter) */
export const V1_PUBLIC_RESERVATIONS_LIMIT = 3;
export const V1_PUBLIC_RESERVATIONS_WINDOW_MS = 60_000;

/** Standard 429 for v1 public writes (contract: error + message only). */
export function rateLimitExceededResponse(retryAfterMs?: number): NextResponse {
  const headers: Record<string, string> = {};
  if (retryAfterMs != null && retryAfterMs > 0) {
    headers["Retry-After"] = String(Math.max(1, Math.ceil(retryAfterMs / 1000)));
  }
  return NextResponse.json(
    { error: "Too many requests", message: "Please try again later." },
    { status: 429, headers }
  );
}
