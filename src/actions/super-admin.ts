"use server";

import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/**
 * Returns a list of all organizations for the Super Admin dealership directory.
 * Includes basic info for filtering and display.
 */
export async function getOrganizationsAction() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required");
  }

  // Fetch all organizations with some basic relation data for filtering/display
  const organizations = await db.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      branding: {
        select: {
          contactEmail: true,
        },
      },
      _count: {
        select: {
          vehicles: true,
          users: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return organizations;
}

/**
 * Returns platform-wide metrics for the Super Admin dashboard.
 */
export async function getPlatformMetricsAction() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required");
  }

  const [totalOrgs, totalUsers, totalVehicles, recentOrgs] = await Promise.all([
    db.organization.count(),
    db.user.count(),
    db.vehicle.count(),
    db.organization.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    totalOrgs,
    totalUsers,
    totalVehicles,
    recentOrgs,
  };
}

/**
 * Returns a single organization by id for Super Admin dealership detail view.
 * Includes subscription, users, counts, and domains. SUPER_ADMIN only.
 */
export async function getOrganizationByIdAction(id: string) {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required");
  }

  const organization = await db.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      createdAt: true,
      branding: {
        select: {
          contactEmail: true,
        },
      },
      subscription: {
        select: {
          planKey: true,
          status: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
          cancelAtPeriodEnd: true,
        },
      },
      domains: {
        select: {
          id: true,
          hostname: true,
          isPrimary: true,
          status: true,
        },
        orderBy: [{ isPrimary: "desc" }, { hostname: "asc" }],
      },
      users: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      _count: {
        select: {
          vehicles: true,
          users: true,
        },
      },
    },
  });

  return organization;
}

/**
 * Returns all users across the platform with organization info for Super Admin global user directory.
 * SUPER_ADMIN only. Read-only.
 */
export async function getGlobalUsersAction() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required");
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return users;
}

/**
 * Suspends a dealership. SUPER_ADMIN only. Audited.
 */
export async function suspendOrganizationAction(organizationId: string) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required");
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!org) throw new Error("Organization not found");
  if (org.status === "SUSPENDED") throw new Error("Organization is already suspended");

  await db.organization.update({
    where: { id: organizationId },
    data: { status: "SUSPENDED" },
  });

  await logAuditEvent({
    eventType: "organization.suspended",
    actorId: user.id,
    actorRole: user.role,
    entityType: "Organization",
    entityId: organizationId,
    organizationId,
    metadata: { orgName: org.name, orgSlug: org.slug },
  });

  revalidatePath("/super-admin/dealerships");
  revalidatePath(`/super-admin/dealerships/${organizationId}`);
}

/**
 * Reactivates a suspended dealership. SUPER_ADMIN only. Audited.
 */
export async function reactivateOrganizationAction(organizationId: string) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required");
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, slug: true, status: true },
  });
  if (!org) throw new Error("Organization not found");
  if (org.status === "ACTIVE") throw new Error("Organization is already active");

  await db.organization.update({
    where: { id: organizationId },
    data: { status: "ACTIVE" },
  });

  await logAuditEvent({
    eventType: "organization.reactivated",
    actorId: user.id,
    actorRole: user.role,
    entityType: "Organization",
    entityId: organizationId,
    organizationId,
    metadata: { orgName: org.name, orgSlug: org.slug },
  });

  revalidatePath("/super-admin/dealerships");
  revalidatePath(`/super-admin/dealerships/${organizationId}`);
}

const AUDIT_LOG_PAGE_SIZE = 300;

/**
 * Returns recent platform-wide audit events for Super Admin system log. SUPER_ADMIN only. Read-only.
 */
export async function getAuditLogAction() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.SUPER_ADMIN) {
    throw new Error("Unauthorized: Super Admin access required");
  }

  const events = await db.activityEvent.findMany({
    take: AUDIT_LOG_PAGE_SIZE,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      eventType: true,
      entityType: true,
      entityId: true,
      actorId: true,
      actorRole: true,
      organizationId: true,
      metadata: true,
      createdAt: true,
      organization: {
        select: { id: true, name: true },
      },
    },
  });

  const actorIds = [...new Set(events.map((e) => e.actorId).filter(Boolean))] as string[];
  const actors =
    actorIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  return events.map((e) => ({
    id: e.id,
    eventType: e.eventType,
    entityType: e.entityType,
    entityId: e.entityId,
    actorRole: e.actorRole,
    organizationId: e.organizationId,
    metadata: e.metadata as Record<string, unknown> | null,
    createdAt: e.createdAt,
    organization: e.organization,
    actor: e.actorId ? actorMap.get(e.actorId) ?? null : null,
  }));
}
