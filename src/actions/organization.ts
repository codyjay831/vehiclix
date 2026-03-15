"use server";

import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { normalizeSlug, validateOrganizationSlug } from "@/lib/organization";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const BrandingSchema = z.object({
  logoUrl: z.string().url().optional().or(z.literal("")),
  heroHeadline: z.string().max(200).optional().or(z.literal("")),
  heroSubheadline: z.string().max(1000).optional().or(z.literal("")),
  aboutBlurb: z.string().max(2000).optional().or(z.literal("")),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  socialImageUrl: z.string().url().optional().or(z.literal("")),
});

/**
 * Creates a new organization.
 * (Currently intended for internal/system use as no public-facing 
 * organization creation flow exists in the current UI).
 */
export async function createOrganizationAction(name: string, slug: string) {
  // 1. Normalize and Validate
  const normalizedSlug = normalizeSlug(slug);
  const validation = validateOrganizationSlug(normalizedSlug);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // 2. Check Uniqueness (Nice error message)
  const existing = await db.organization.findUnique({
    where: { slug: normalizedSlug },
  });

  if (existing) {
    return { success: false, error: "This slug is already in use." };
  }

  // 3. Create
  const org = await db.organization.create({
    data: {
      name,
      slug: normalizedSlug,
    },
  });

  // 4. Audit
  await logAuditEvent({
    eventType: "organization.create",
    entityType: "Organization",
    entityId: org.id,
    organizationId: org.id,
    metadata: { name: org.name, slug: org.slug },
  });

  return { success: true, organization: org };
}

/**
 * Updates an organization's slug.
 * Restricted to the organization owner.
 */
export async function updateOrganizationSlugAction(organizationId: string, newSlug: string) {
  // 1. Auth check
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.OWNER || user.organizationId !== organizationId) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Normalize and Validate
  const normalizedSlug = normalizeSlug(newSlug);
  const validation = validateOrganizationSlug(normalizedSlug);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // 3. Check Uniqueness
  const existing = await db.organization.findUnique({
    where: { slug: normalizedSlug },
  });

  if (existing && existing.id !== organizationId) {
    return { success: false, error: "This slug is already in use." };
  }

  const oldOrg = await db.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true },
  });

  // 4. Update
  const updatedOrg = await db.organization.update({
    where: { id: organizationId },
    data: { slug: normalizedSlug },
  });

  // 5. Audit
  await logAuditEvent({
    eventType: "organization.update_slug",
    actorId: user.id,
    actorRole: user.role,
    entityType: "Organization",
    entityId: updatedOrg.id,
    organizationId: updatedOrg.id,
    metadata: { oldSlug: oldOrg?.slug, newSlug: updatedOrg.slug },
  });

  // 6. Cache cleanup
  revalidatePath("/admin/settings");
  revalidatePath(`/${updatedOrg.slug}`);
  if (oldOrg?.slug) {
    revalidatePath(`/${oldOrg.slug}`);
  }
  
  return { success: true, organization: updatedOrg };
}

/**
 * Updates or creates branding settings for an organization.
 * Restricted to the organization owner.
 */
export async function updateOrganizationBrandingAction(rawData: unknown) {
  // 1. Auth & Context Resolution
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.OWNER || !user.organizationId) {
    return { success: false, error: "Unauthorized" };
  }

  const orgId = user.organizationId;

  // 2. Validate Data
  const validation = BrandingSchema.safeParse(rawData);
  if (!validation.success) {
    return { 
      success: false, 
      error: "Validation failed: " + validation.error.issues.map(e => e.message).join(", ") 
    };
  }
  const data = validation.data;

  // 3. Resolve Slug for Revalidation
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });

  if (!org) {
    return { success: false, error: "Organization not found" };
  }

  // 4. Upsert Branding
  const branding = await db.organizationBranding.upsert({
    where: { organizationId: orgId },
    create: {
      ...data,
      organizationId: orgId,
    },
    update: data,
  });

  // 5. Audit
  await logAuditEvent({
    eventType: "organization.update_branding",
    actorId: user.id,
    actorRole: user.role,
    entityType: "OrganizationBranding",
    entityId: branding.id,
    organizationId: orgId,
    metadata: data,
  });

  // 6. Revalidate relevant paths
  revalidatePath(`/${org.slug}`);
  revalidatePath(`/${org.slug}/about`);
  revalidatePath(`/${org.slug}/contact`);
  revalidatePath(`/${org.slug}/inventory`);
  revalidatePath("/admin/settings/branding");

  return { success: true, branding };
}
