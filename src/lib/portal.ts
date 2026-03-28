import { db } from "./db";
import { DealStatus } from "@prisma/client";
import { getAuthenticatedUser } from "./auth";
import {
  portalActiveDealVehicleSelect,
  vehicleNestedAdminContextSelect,
} from "@/lib/prisma/vehicle-safe-select";

/**
 * Resolves the currently authenticated customer user.
 * Returns null if not authenticated or not a customer.
 */
export async function resolvePortalIdentity() {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  return user;
}

/**
 * Fetches the most recent active (non-final) deal for the customer.
 */
export async function getActiveDeal(userId: string, organizationId?: string | null) {
  if (!organizationId) {
    throw new Error("Organization context required for portal access");
  }

  return db.deal.findFirst({
    where: {
      userId,
      organizationId,
      NOT: {
        dealStatus: {
          in: [DealStatus.COMPLETED, DealStatus.CANCELLED],
        },
      },
    },
    include: {
      vehicle: {
        select: portalActiveDealVehicleSelect,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Fetches recent vehicle inquiries submitted by the customer.
 */
export async function getRecentInquiries(userId: string, organizationId?: string | null) {
  if (!organizationId) {
    throw new Error("Organization context required for portal access");
  }

  return db.vehicleInquiry.findMany({
    where: {
      userId,
      organizationId,
    },
    include: {
      vehicle: { select: vehicleNestedAdminContextSelect },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });
}

/**
 * Fetches recent vehicle requests submitted by the customer.
 */
export async function getRecentRequests(userId: string, organizationId?: string | null) {
  if (!organizationId) {
    throw new Error("Organization context required for portal access");
  }

  return db.vehicleRequest.findMany({
    where: {
      userId,
      organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });
}
