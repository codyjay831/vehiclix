import { db } from "./db";
import { DealFullPayload, DealStatus } from "@/types";

/**
 * Fetches all deals for the admin dashboard.
 * Includes associated vehicle, user, and latest deposit status.
 */
export async function getAdminDeals() {
  return db.deal.findMany({
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
export async function getAdminDealDetail(id: string) {
  return db.deal.findUnique({
    where: { id },
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
export async function getDealActivity(dealId: string) {
  return db.activityEvent.findMany({
    where: {
      entityType: "Deal",
      entityId: dealId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
