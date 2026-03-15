import { db } from "./db";
import { RESERVED_SLUGS } from "./constants";
import { DomainStatus, Organization, OrganizationDomain } from "@prisma/client";
import { BRANDING } from "@/config/branding";
export { normalizeHostname, isPlatformHost } from "./domain-shared";

/**
 * Normalizes a string for use as a slug:
 * - lowercase
 * - trimmed
 * - replaces spaces and non-alphanumeric with hyphens
 * - collapses multiple hyphens
 */
export function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "");    // Remove leading/trailing hyphens
}

/**
 * Validates whether a slug is reserved or otherwise invalid.
 * Returns { valid: true } or { valid: false, error: string }
 */
export function validateOrganizationSlug(slug: string): { valid: boolean; error?: string } {
  const normalized = normalizeSlug(slug);

  if (normalized.length < 3) {
    return { valid: false, error: "Slug must be at least 3 characters long." };
  }

  if (RESERVED_SLUGS.includes(normalized)) {
    return { valid: false, error: "This slug is reserved and cannot be used." };
  }

  return { valid: true };
}

/**
 * Fetches an organization by its ID.
 */
export async function getOrganizationById(id: string) {
  return db.organization.findUnique({
    where: { id },
    include: { 
      branding: true,
      homepage: true,
      subscription: true,
      domains: {
        where: { status: DomainStatus.VERIFIED }
      }
    },
  });
}

/**
 * Fetches an organization by its slug.
 */
export async function getOrganizationBySlug(slug: string) {
  return db.organization.findUnique({
    where: { slug },
    include: { 
      branding: true,
      homepage: true,
      subscription: true,
      domains: {
        where: { status: DomainStatus.VERIFIED }
      }
    },
  });
}

/**
 * Returns the canonical base URL for an organization.
 * Prefers the primary verified custom domain, falls back to platform slug URL.
 */
export function getCanonicalUrl(organization: Organization & { domains?: OrganizationDomain[] }, path: string = "") {
  const primaryDomain = organization.domains?.find(d => d.isPrimary) || organization.domains?.[0];
  const baseUrl = primaryDomain 
    ? `https://${primaryDomain.hostname}` 
    : `https://${BRANDING.platformDomain}/${organization.slug}`;
  
  const normalizedPath = path && !path.startsWith("/") ? `/${path}` : path;
  return `${baseUrl}${normalizedPath}`;
}
