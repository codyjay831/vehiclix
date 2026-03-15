import { OrganizationHomepage, OrganizationBranding } from "@prisma/client";

export const HOMEPAGE_DEFAULTS = {
  showPromo: false,
  showTrustHighlights: true,
  showFeaturedInventory: true,
  showAboutTeaser: true,
  showContactCta: true,
  showTestimonial: false,
  heroPrimaryCtaRoute: "inventory",
} as const;

export type ValidCtaRoute = "inventory" | "contact" | "request-vehicle" | "register";

export interface TrustHighlight {
  icon: string;
  title: string;
  description: string;
}

/**
 * Provides a safe homepage content object, falling back to defaults
 * and branding data where appropriate.
 */
export function getSafeHomepage(
  homepage: OrganizationHomepage | null | undefined,
  branding: OrganizationBranding | null | undefined,
  organizationName: string
) {
  const h = homepage;
  const b = branding;

  return {
    // Announcement Bar
    showPromo: h?.showPromo ?? HOMEPAGE_DEFAULTS.showPromo,
    promoText: h?.promoText || "",
    
    // Hero Section
    heroHeadline: h?.heroHeadline || b?.heroHeadline || `Experience Electric Excellence.`,
    heroSubheadline: h?.heroSubheadline || b?.heroSubheadline || "A highly-curated showroom of high-performance electric vehicles. Transparent specs, premium media, and home energy integration — redefining the used EV journey.",
    heroPrimaryCtaLabel: h?.heroPrimaryCtaLabel || "Browse Showroom",
    heroPrimaryCtaRoute: (h?.heroPrimaryCtaRoute as ValidCtaRoute) || HOMEPAGE_DEFAULTS.heroPrimaryCtaRoute,
    
    // Trust Highlights
    showTrustHighlights: h?.showTrustHighlights ?? HOMEPAGE_DEFAULTS.showTrustHighlights,
    trustHighlights: (h?.trustHighlightsJson as unknown as TrustHighlight[]) || [
      { icon: "ShieldCheck", title: "Curated Selection", description: "Every vehicle is thoroughly inspected." },
      { icon: "Zap", title: "Verified Battery Health", description: "Detailed range and health reports." },
      { icon: "ShieldCheck", title: "Transparent Pricing", description: "No hidden fees, ever." },
    ],
    
    // Featured Inventory
    showFeaturedInventory: h?.showFeaturedInventory ?? HOMEPAGE_DEFAULTS.showFeaturedInventory,
    
    // Testimonial
    showTestimonial: h?.showTestimonial ?? HOMEPAGE_DEFAULTS.showTestimonial,
    testimonialQuote: h?.testimonialQuote || "",
    testimonialAuthor: h?.testimonialAuthor || "",
    
    // About Teaser
    showAboutTeaser: h?.showAboutTeaser ?? HOMEPAGE_DEFAULTS.showAboutTeaser,
    aboutTeaser: h?.aboutTeaser || b?.aboutBlurb || `Welcome to ${organizationName}. We are committed to providing the best electric vehicle experience.`,
    
    // Contact/Service CTA
    showContactCta: h?.showContactCta ?? HOMEPAGE_DEFAULTS.showContactCta,
    contactCtaHeadline: h?.contactCtaHeadline || "Ready to drive?",
    contactCtaBody: h?.contactCtaBody || "Contact us to schedule a test drive or learn more about our EVs.",
  };
}
