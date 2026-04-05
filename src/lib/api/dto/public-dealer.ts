/**
 * Public-safe dealer DTO for Website Integration API v1.
 * Stable field names; no internal notes, billing, or admin-only fields.
 */

import { getCanonicalUrl } from "@/lib/organization";
import type { ResolvedDealer } from "@/lib/api/resolve-dealer";

import { PublicSiteMode } from "@prisma/client";

/** Public branding fields only (no internal keys). */
export interface PublicDealerBranding {
  publicSiteMode: PublicSiteMode;
  logoUrl: string | null;
  primaryColor: string | null;
  heroHeadline: string | null;
  heroSubheadline: string | null;
  aboutBlurb: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  socialImageUrl: string | null;
}

/** Public homepage config only (no internal keys). */
export interface PublicDealerHomepage {
  showPromo: boolean;
  promoText: string | null;
  heroHeadline: string | null;
  heroSubheadline: string | null;
  heroPrimaryCtaLabel: string | null;
  heroPrimaryCtaRoute: string | null;
  showTrustHighlights: boolean;
  trustHighlightsJson: unknown;
  showFeaturedInventory: boolean;
  showTestimonial: boolean;
  testimonialQuote: string | null;
  testimonialAuthor: string | null;
  showAboutTeaser: boolean;
  aboutTeaser: string | null;
  showContactCta: boolean;
  contactCtaHeadline: string | null;
  contactCtaBody: string | null;
}

export interface PublicDealerDto {
  /** Organization id for multitenancy (e.g. storefront TenantProvider). Public identity remains slug. */
  id: string;
  name: string;
  slug: string;
  /** Canonical base URL for this dealer (no trailing path). */
  canonicalBaseUrl: string;
  phone: string | null;
  branding: PublicDealerBranding | null;
  homepage: PublicDealerHomepage | null;
}

/**
 * Maps a resolved organization to the public dealer DTO.
 * Uses core getCanonicalUrl; does not expose subscription, domain internals, or internal ids as primary.
 */
export function toPublicDealerDto(organization: NonNullable<ResolvedDealer>): PublicDealerDto {
  const canonicalBaseUrl = getCanonicalUrl(organization, "");

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    canonicalBaseUrl,
    phone: organization.phone ?? null,
    branding: organization.branding
      ? {
          publicSiteMode: organization.branding.publicSiteMode,
          logoUrl: organization.branding.logoUrl ?? null,
          primaryColor: organization.branding.primaryColor ?? null,
          heroHeadline: organization.branding.heroHeadline ?? null,
          heroSubheadline: organization.branding.heroSubheadline ?? null,
          aboutBlurb: organization.branding.aboutBlurb ?? null,
          contactEmail: organization.branding.contactEmail ?? null,
          contactPhone: organization.branding.contactPhone ?? null,
          address: organization.branding.address ?? null,
          socialImageUrl: organization.branding.socialImageUrl ?? null,
        }
      : null,
    homepage: organization.homepage
      ? {
          showPromo: organization.homepage.showPromo,
          promoText: organization.homepage.promoText ?? null,
          heroHeadline: organization.homepage.heroHeadline ?? null,
          heroSubheadline: organization.homepage.heroSubheadline ?? null,
          heroPrimaryCtaLabel: organization.homepage.heroPrimaryCtaLabel ?? null,
          heroPrimaryCtaRoute: organization.homepage.heroPrimaryCtaRoute ?? null,
          showTrustHighlights: organization.homepage.showTrustHighlights,
          trustHighlightsJson: organization.homepage.trustHighlightsJson ?? null,
          showFeaturedInventory: organization.homepage.showFeaturedInventory,
          showTestimonial: organization.homepage.showTestimonial,
          testimonialQuote: organization.homepage.testimonialQuote ?? null,
          testimonialAuthor: organization.homepage.testimonialAuthor ?? null,
          showAboutTeaser: organization.homepage.showAboutTeaser,
          aboutTeaser: organization.homepage.aboutTeaser ?? null,
          showContactCta: organization.homepage.showContactCta,
          contactCtaHeadline: organization.homepage.contactCtaHeadline ?? null,
          contactCtaBody: organization.homepage.contactCtaBody ?? null,
        }
      : null,
  };
}
