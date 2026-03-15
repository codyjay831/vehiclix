"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { db } from "@/lib/db";
import { getAuthenticatedUser, requireUserWithOrg } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
import { normalizeHostname, isPlatformHost } from "@/lib/domain-shared";
import { logAuditEvent } from "@/lib/audit";
import { Role, DomainStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { hasFeature } from "@/lib/billing";
import crypto from "node:crypto";
import { Resolver } from "node:dns/promises";

/**
 * Adds a new custom domain to the organization.
 * Stored as PENDING with a unique verification token.
 */
export async function addDomainAction(hostname: string) {
  await requireWriteAccess();
  // 1. Auth check
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && !user.isSupportMode) {
    return { success: false, error: "Unauthorized" };
  }

  const orgId = user.organizationId;

  // 1.1 Feature Gating Check
  const subscription = await db.organizationSubscription.findUnique({
    where: { organizationId: orgId },
  });

  if (!hasFeature(subscription || null, "customDomains")) {
    return { success: false, error: "Upgrade to Pro or Premium to use custom domains." };
  }

  // 2. Normalize and Validate
  const normalized = normalizeHostname(hostname);
  
  if (normalized.length < 3) {
    return { success: false, error: "Domain name too short." };
  }

  if (isPlatformHost(normalized)) {
    return { success: false, error: "Cannot add a platform domain." };
  }

  // 3. Check for duplicates (hostname is @unique)
  const existing = await db.organizationDomain.findUnique({
    where: { hostname: normalized },
  });

  if (existing) {
    return { success: false, error: "This domain is already registered." };
  }

  // 4. Generate Verification Token
  const verificationToken = `vehiclix-verify-${crypto.randomBytes(16).toString("hex")}`;

  // 5. Create
  const domain = await db.organizationDomain.create({
    data: {
      hostname: normalized,
      organizationId: orgId,
      verificationToken,
      status: DomainStatus.PENDING,
    },
  });

  // 6. Audit
  await logAuditEvent({
    eventType: "domain.add",
    actorId: user.id,
    actorRole: user.role,
    entityType: "OrganizationDomain",
    entityId: domain.id,
    organizationId: orgId,
    metadata: { hostname: domain.hostname },
  });

  revalidatePath("/admin/settings/domains");
  return { success: true, domain };
}

/**
 * Deletes a domain.
 */
export async function deleteDomainAction(domainId: string) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && !user.isSupportMode) {
    return { success: false, error: "Unauthorized" };
  }

  const domain = await db.organizationDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain || domain.organizationId !== user.organizationId) {
    return { success: false, error: "Domain not found." };
  }

  await db.organizationDomain.delete({
    where: { id: domainId },
  });

  // Audit
  await logAuditEvent({
    eventType: "domain.delete",
    actorId: user.id,
    actorRole: user.role,
    entityType: "OrganizationDomain",
    entityId: domainId,
    organizationId: user.organizationId,
    metadata: { hostname: domain.hostname },
  });

  revalidatePath("/admin/settings/domains");
  return { success: true };
}

/**
 * Verifies a domain by checking for a DNS TXT record.
 */
export async function verifyDomainAction(domainId: string) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && !user.isSupportMode) {
    return { success: false, error: "Unauthorized" };
  }

  const domain = await db.organizationDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain || domain.organizationId !== user.organizationId) {
    return { success: false, error: "Domain not found." };
  }

  try {
    const dnsResolver = new Resolver();
    const records = await dnsResolver.resolveTxt(domain.hostname);
    const flattenedRecords = records.flat();
    
    const isVerified = flattenedRecords.includes(domain.verificationToken);

    if (isVerified) {
      await db.organizationDomain.update({
        where: { id: domainId },
        data: { 
          status: DomainStatus.VERIFIED,
          verifiedAt: new Date(),
        },
      });

      // Audit
      await logAuditEvent({
        eventType: "domain.verify_success",
        actorId: user.id,
        actorRole: user.role,
        entityType: "OrganizationDomain",
        entityId: domainId,
        organizationId: user.organizationId,
        metadata: { hostname: domain.hostname },
      });

      revalidatePath("/admin/settings/domains");
      return { success: true };
    } else {
      return { success: false, error: "Verification record not found. Please ensure the TXT record is correctly added to your DNS." };
    }
  } catch (error) {
    console.error("[VERIFY_DOMAIN_ERROR]", error);
    return { success: false, error: "DNS lookup failed. Please try again later." };
  }
}

/**
 * Sets a domain as the primary domain for the organization.
 * Only VERIFIED domains can be primary.
 */
export async function setPrimaryDomainAction(domainId: string) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && !user.isSupportMode) {
    return { success: false, error: "Unauthorized" };
  }

  const domain = await db.organizationDomain.findUnique({
    where: { id: domainId },
  });

  if (!domain || domain.organizationId !== user.organizationId) {
    return { success: false, error: "Domain not found." };
  }

  if (domain.status !== DomainStatus.VERIFIED) {
    return { success: false, error: "Only verified domains can be set as primary." };
  }

  // Transaction: Unset existing primary and set new primary
  await db.$transaction([
    db.organizationDomain.updateMany({
      where: { organizationId: user.organizationId, isPrimary: true },
      data: { isPrimary: false },
    }),
    db.organizationDomain.update({
      where: { id: domainId },
      data: { isPrimary: true },
    }),
  ]);

  // Audit
  await logAuditEvent({
    eventType: "domain.set_primary",
    actorId: user.id,
    actorRole: user.role,
    entityType: "OrganizationDomain",
    entityId: domainId,
    organizationId: user.organizationId,
    metadata: { hostname: domain.hostname },
  });

  revalidatePath("/admin/settings/domains");
  return { success: true };
}
