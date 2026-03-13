import { db } from "./db";
import { VehicleRequestWithProposals, VehicleRequestStatus } from "@/types";

/**
 * Fetches all vehicle sourcing requests for the admin dashboard.
 * Includes the associated user/customer.
 */
export async function getAdminRequests(organizationId: string) {
  return db.vehicleRequest.findMany({
    where: { organizationId },
    include: {
      user: true,
      _count: {
        select: { proposals: true }
      }
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Fetches a single vehicle request by ID with full context for the detail view.
 * Includes user/customer and associated proposals (read-only).
 */
export async function getAdminRequestDetail(organizationId: string, id: string) {
  return db.vehicleRequest.findUnique({
    where: { id, organizationId },
    include: {
      user: true,
      proposals: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}
