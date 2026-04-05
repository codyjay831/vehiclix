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
    heroHeadline: h?.heroHeadline || b?.heroHeadline || `Welcome to ${organizationName}`,
    heroSubheadline: h?.heroSubheadline || b?.heroSubheadline || "Browse our inventory, explore vehicle details, and get in touch — all in one place.",
    heroPrimaryCtaLabel: h?.heroPrimaryCtaLabel || "View Inventory",
    heroPrimaryCtaRoute: (h?.heroPrimaryCtaRoute as ValidCtaRoute) || HOMEPAGE_DEFAULTS.heroPrimaryCtaRoute,
    
    // Trust Highlights
    showTrustHighlights: h?.showTrustHighlights ?? HOMEPAGE_DEFAULTS.showTrustHighlights,
    trustHighlights: (h?.trustHighlightsJson as unknown as TrustHighlight[]) || [
      { icon: "ShieldCheck", title: "Quality Inspected", description: "Every vehicle is thoroughly reviewed." },
      { icon: "Zap", title: "Transparent Details", description: "Full specs and vehicle history available." },
      { icon: "ShieldCheck", title: "No Hidden Fees", description: "Honest, upfront pricing." },
    ],
    
    // Featured Inventory
    showFeaturedInventory: h?.showFeaturedInventory ?? HOMEPAGE_DEFAULTS.showFeaturedInventory,
    
    // Testimonial
    showTestimonial: h?.showTestimonial ?? HOMEPAGE_DEFAULTS.showTestimonial,
    testimonialQuote: h?.testimonialQuote || "",
    testimonialAuthor: h?.testimonialAuthor || "",
    
    // About Teaser
    showAboutTeaser: h?.showAboutTeaser ?? HOMEPAGE_DEFAULTS.showAboutTeaser,
    aboutTeaser: h?.aboutTeaser || b?.aboutBlurb || `Welcome to ${organizationName}. We're here to help you find the right vehicle.`,
    
    // Contact/Service CTA
    showContactCta: h?.showContactCta ?? HOMEPAGE_DEFAULTS.showContactCta,
    contactCtaHeadline: h?.contactCtaHeadline || "Ready to get started?",
    contactCtaBody: h?.contactCtaBody || "Get in touch to schedule a visit or learn more about our inventory.",
  };
}
