import { db } from "./db";
import { DealStatus } from "@prisma/client";
import { getAuthenticatedUser } from "./auth";

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
export async function getActiveDeal(userId: string) {
  return db.deal.findFirst({
    where: {
      userId,
      NOT: {
        dealStatus: {
          in: [DealStatus.COMPLETED, DealStatus.CANCELLED],
        },
      },
    },
    include: {
      vehicle: {
        include: {
          media: {
            orderBy: {
              displayOrder: "asc",
            },
            take: 1,
          },
        },
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
export async function getRecentInquiries(userId: string) {
  return db.vehicleInquiry.findMany({
    where: {
      userId,
    },
    include: {
      vehicle: true,
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
export async function getRecentRequests(userId: string) {
  return db.vehicleRequest.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });
}
