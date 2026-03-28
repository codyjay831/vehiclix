import { db } from "./db";
import { InquiryWithVehicle } from "@/types";
import { vehicleNestedAdminContextSelect } from "@/lib/prisma/vehicle-safe-select";

/**
 * Fetches all inquiries for the admin dashboard.
 * Includes associated vehicle information.
 */
export async function getAdminInquiries(organizationId: string): Promise<InquiryWithVehicle[]> {
  return db.vehicleInquiry.findMany({
    where: { organizationId },
    include: {
      vehicle: { select: vehicleNestedAdminContextSelect },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Fetches a single inquiry by ID with full context for the detail view.
 * Includes vehicle and associated user (if any).
 */
export async function getInquiryDetail(organizationId: string, id: string) {
  return db.vehicleInquiry.findUnique({
    where: { id, organizationId },
    include: {
      vehicle: { select: vehicleNestedAdminContextSelect },
      user: true,
    },
  });
}
