import { db } from "./db";
import { InquiryWithVehicle, InquiryStatus } from "@/types";

/**
 * Fetches all inquiries for the admin dashboard.
 * Includes associated vehicle information.
 */
export async function getAdminInquiries(): Promise<InquiryWithVehicle[]> {
  return db.vehicleInquiry.findMany({
    include: {
      vehicle: true,
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
export async function getInquiryDetail(id: string) {
  return db.vehicleInquiry.findUnique({
    where: { id },
    include: {
      vehicle: true,
      user: true,
    },
  });
}
