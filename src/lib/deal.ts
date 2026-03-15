import { db } from "./db";
import { DealFullPayload, DealStatus } from "@/types";

/**
 * Fetches all deals for the admin dashboard.
 * Includes associated vehicle, user, and latest deposit status.
 */
export async function getAdminDeals(organizationId: string) {
  return db.deal.findMany({
    where: { organizationId },
    include: {
      vehicle: true,
      user: true,
      deposits: {
        orderBy: {
          paymentTimestamp: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Fetches a single deal by ID with full context for the detail view.
 */
export async function getAdminDealDetail(organizationId: string, id: string) {
  return db.deal.findFirst({
    where: { id, organizationId },
    include: {
      vehicle: true,
      user: true,
      deposits: {
        orderBy: {
          paymentTimestamp: "desc",
        },
      },
      documents: {
        orderBy: {
          createdAt: "asc",
        },
      },
      envelopes: {
        orderBy: {
          sentAt: "desc",
        },
      },
    },
  });
}

/**
 * Fetches activity events for a specific deal.
 */
export async function getDealActivity(organizationId: string, dealId: string) {
  return db.activityEvent.findMany({
    where: {
      entityType: "Deal",
      entityId: dealId,
      organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
