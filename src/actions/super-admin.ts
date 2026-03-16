"use server";

import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";

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
