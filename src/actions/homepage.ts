"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { db } from "@/lib/db";
import { getAuthenticatedUser, requireUserWithOrg } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const TrustHighlightSchema = z.object({
  icon: z.string().min(1, "Icon is required"),
  title: z.string().max(40, "Title must be 40 characters or less"),
  description: z.string().max(100, "Description must be 100 characters or less"),
});

const HomepageSchema = z.object({
  showPromo: z.boolean(),
  promoText: z.string().max(100).optional().or(z.literal("")),

  heroHeadline: z.string().max(80).optional().or(z.literal("")),
  heroSubheadline: z.string().max(160).optional().or(z.literal("")),
  heroPrimaryCtaLabel: z.string().max(30).optional().or(z.literal("")),
  heroPrimaryCtaRoute: z.enum(["inventory", "contact", "register", "request-vehicle"]).optional(),

  trustHighlightsJson: z.array(TrustHighlightSchema).min(3).max(4).optional(),

  showFeaturedInventory: z.boolean(),

  showTestimonial: z.boolean(),
  testimonialQuote: z.string().max(300).optional().or(z.literal("")),
  testimonialAuthor: z.string().max(100).optional().or(z.literal("")),

  showAboutTeaser: z.boolean(),
  aboutTeaser: z.string().optional().or(z.literal("")),

  showContactCta: z.boolean(),
  contactCtaHeadline: z.string().max(100).optional().or(z.literal("")),
  contactCtaBody: z.string().optional().or(z.literal("")),
});

export type HomepageEditorPayload = z.infer<typeof HomepageSchema>;

/**
 * Updates or creates homepage configuration for an organization.
 * Restricted to the organization owner.
 */
export async function updateHomepageAction(rawData: unknown) {
  await requireWriteAccess();
  // 1. Auth & Context Resolution
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && !user.isSupportMode) {
    return { success: false, error: "Unauthorized" };
  }

  const orgId = user.organizationId;

  // 2. Validate Data
  const validation = HomepageSchema.safeParse(rawData);
  if (!validation.success) {
    return { 
      success: false, 
      error: "Validation failed: " + validation.error.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") 
    };
  }
  
  // Normalize strings and handle empty strings
  const data = { ...validation.data };
  
  // Basic normalization: trim and empty string to null mapping for DB
  const normalizedData = {
    showPromo: data.showPromo,
    promoText: data.promoText?.trim() || null,
    heroHeadline: data.heroHeadline?.trim() || null,
    heroSubheadline: data.heroSubheadline?.trim() || null,
    heroPrimaryCtaLabel: data.heroPrimaryCtaLabel?.trim() || null,
    heroPrimaryCtaRoute: data.heroPrimaryCtaRoute || "inventory",
    trustHighlightsJson: data.trustHighlightsJson || undefined,
    showTrustHighlights: data.trustHighlightsJson ? true : undefined,
    showFeaturedInventory: data.showFeaturedInventory,
    showTestimonial: data.showTestimonial,
    testimonialQuote: data.testimonialQuote?.trim() || null,
    testimonialAuthor: data.testimonialAuthor?.trim() || null,
    showAboutTeaser: data.showAboutTeaser,
    aboutTeaser: data.aboutTeaser?.trim() || null,
    showContactCta: data.showContactCta,
    contactCtaHeadline: data.contactCtaHeadline?.trim() || null,
    contactCtaBody: data.contactCtaBody?.trim() || null,
  };

  // 3. Resolve Slug for Revalidation
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });

  if (!org) {
    return { success: false, error: "Organization not found" };
  }

  // 4. Upsert Homepage Content
  const homepage = await db.organizationHomepage.upsert({
    where: { organizationId: orgId },
    create: {
      ...normalizedData,
      organizationId: orgId,
    },
    update: normalizedData,
  });

  // 5. Audit
  await logAuditEvent({
    eventType: "organization.update_homepage",
    actorId: user.id,
    actorRole: user.role,
    entityType: "OrganizationHomepage",
    entityId: homepage.id,
    organizationId: orgId,
    metadata: data,
  });

  // 6. Revalidate only the dealer homepage
  revalidatePath(`/${org.slug}`);
  // Also revalidate admin settings where the form lives
  revalidatePath("/admin/settings/storefront");

  return { success: true, homepage };
}
