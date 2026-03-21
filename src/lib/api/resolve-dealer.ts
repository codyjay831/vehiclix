/**
 * Request-boundary dealer resolver for public API v1.
 * Used by /v1/public/dealers, and later by catalog, leads, reservations, auth-bridge.
 *
 * Rules:
 * - Resolve from request host first (domain → verified OrganizationDomain → org).
 * - Fallback: dealerSlug query param only in approved contexts (e.g. platform host or no domain match).
 * - Never trust client-provided organizationId.
 */

import { db } from "@/lib/db";
import { DomainStatus } from "@prisma/client";
import {
  getOrganizationBySlug,
  validateOrganizationSlugForResolution,
} from "@/lib/organization";
import { normalizeHostname, isPlatformHost } from "@/lib/domain-shared";

export type ResolvedDealer = Awaited<ReturnType<typeof getOrganizationBySlug>>;

export type ResolveDealerResult =
  | { ok: true; organization: NonNullable<ResolvedDealer> }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "INVALID_SLUG"; message: string };

/**
 * Resolves dealer from the incoming request.
 * - Primary: Host header → normalized hostname → verified domain lookup → organization by slug.
 * - Fallback: Query param "dealerSlug" when host is platform or domain did not resolve (approved for public read-only endpoints).
 * - Never reads organizationId from query, body, or headers.
 *
 * @returns ResolveDealerResult: ok + organization, or ok false with NOT_FOUND (404) or INVALID_SLUG (400).
 */
export async function resolveDealerFromRequest(request: Request): Promise<ResolveDealerResult> {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? "";
  const normalizedHost = normalizeHostname(host);

  // 1. Domain-first: try to resolve by verified custom domain
  // Schema: hostname is @unique; (hostname, status) is @@index only — use findFirst for hostname + VERIFIED
  if (!isPlatformHost(host)) {
    const domainRecord = await db.organizationDomain.findFirst({
      where: {
        hostname: normalizedHost,
        status: DomainStatus.VERIFIED,
      },
      select: {
        organization: {
          select: { slug: true },
        },
      },
    });

    if (domainRecord?.organization?.slug) {
      const organization = await getOrganizationBySlug(domainRecord.organization.slug);
      if (organization) {
        return { ok: true, organization };
      }
    }
  }

  // 2. Fallback: dealerSlug (approved for public GET when no dealer from host)
  const dealerSlug = url.searchParams.get("dealerSlug")?.trim();
  if (dealerSlug) {
    const validation = validateOrganizationSlugForResolution(dealerSlug);
    if (!validation.valid || !validation.normalized) {
      return { ok: false, code: "INVALID_SLUG", message: validation.error ?? "Invalid dealer slug" };
    }
    const organization = await getOrganizationBySlug(validation.normalized);
    if (organization) {
      return { ok: true, organization };
    }
  }

  return { ok: false, code: "NOT_FOUND" };
}
