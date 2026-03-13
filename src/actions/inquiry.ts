"use server";

import { db } from "@/lib/db";
import { ContactMethod, InquiryStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser, requireUserWithOrg } from "@/lib/auth";
import { notifyDealerOfLead } from "@/lib/notifications";

interface InquiryData {
  vehicleId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact: ContactMethod;
  message?: string;
  tradeInInterest: boolean;
  financingInterest: boolean;
  honeypot?: string;
}

/**
 * Handles vehicle inquiry submissions.
 */
export async function submitInquiryAction(data: InquiryData) {
  // Public action, no auth check needed here but honeypot exists
  if (data.honeypot) return { success: true };

  const { vehicleId, firstName, lastName, email, phone, preferredContact, message, tradeInInterest, financingInterest } = data;

  // Identity Resolution (Stub Account)
  let user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, organizationId: true },
  });

  // Get vehicle to resolve organization ownership
  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
    select: { organizationId: true, year: true, make: true, model: true },
  });

  if (!vehicle || !vehicle.organizationId) {
    throw new Error("Vehicle not found or organization not assigned");
  }

  const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  if (!user) {
    user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        phone,
        role: Role.CUSTOMER,
        isStub: true,
        organizationId: vehicle.organizationId,
      },
    });
  } else if (!user.organizationId) {
    // If an existing stub account is missing an organization, assign it based on this inquiry
    user = await db.user.update({
      where: { id: user.id },
      data: { organizationId: vehicle.organizationId },
    });
  }

  // Create Inquiry
  const inquiry = await db.vehicleInquiry.create({
    data: {
      vehicleId,
      organizationId: vehicle.organizationId,
      userId: user.id,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      preferredContact,
      message,
      tradeInInterest,
      financingInterest,
      inquiryStatus: InquiryStatus.NEW,
    },
  });

  // Log Activity Event
  await db.activityEvent.create({
    data: {
      eventType: "inquiry.submitted",
      entityType: "VehicleInquiry",
      entityId: inquiry.id,
      organizationId: vehicle.organizationId,
      actorId: user.id,
      actorRole: Role.CUSTOMER,
      metadata: { vehicleId },
    },
  });

  // NEW: Notify Dealer of Lead
  await notifyDealerOfLead({
    organizationId: vehicle.organizationId,
    vehicleInfo,
    customerInfo: {
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
    },
    message,
  });

  return { success: true };
}

/**
 * Updates an inquiry's status and logs the event.
 */
export async function updateInquiryStatusAction(id: string, newStatus: InquiryStatus) {
  const user = await requireUserWithOrg();

  const inquiry = await db.vehicleInquiry.findUnique({
    where: { id },
    select: { inquiryStatus: true, userId: true, organizationId: true },
  });

  if (!inquiry || inquiry.organizationId !== user.organizationId) {
    throw new Error("Inquiry not found or access denied");
  }

  // Validate transitions
  const currentStatus = inquiry.inquiryStatus;
  const validTransitions: Record<InquiryStatus, InquiryStatus[]> = {
    [InquiryStatus.NEW]: [InquiryStatus.REVIEWED, InquiryStatus.CLOSED],
    [InquiryStatus.REVIEWED]: [InquiryStatus.RESPONDED, InquiryStatus.CLOSED],
    [InquiryStatus.RESPONDED]: [InquiryStatus.CLOSED],
    [InquiryStatus.CLOSED]: [], 
    [InquiryStatus.CONVERTED]: [], 
  };

  if (!validTransitions[currentStatus].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }

  let eventType = "";
  if (newStatus === InquiryStatus.REVIEWED) eventType = "inquiry.reviewed";
  if (newStatus === InquiryStatus.RESPONDED) eventType = "inquiry.responded";
  if (newStatus === InquiryStatus.CLOSED) eventType = "inquiry.closed";

  await db.$transaction([
    db.vehicleInquiry.update({
      where: { id },
      data: { inquiryStatus: newStatus },
    }),
    ...(eventType
      ? [
          db.activityEvent.create({
            data: {
              eventType,
              entityType: "VehicleInquiry",
              entityId: id,
              organizationId: user.organizationId,
              actorRole: Role.OWNER,
              metadata: { previousStatus: currentStatus },
            },
          }),
        ]
      : []),
  ]);

  revalidatePath("/admin/inquiries");
  revalidatePath(`/admin/inquiries/${id}`);
  return { success: true };
}

/**
 * Updates the owner's internal notes for an inquiry.
 */
export async function updateInquiryNotesAction(id: string, notes: string) {
  const user = await requireUserWithOrg();

  const inquiry = await db.vehicleInquiry.findUnique({
    where: { id },
    select: { organizationId: true },
  });

  if (!inquiry || inquiry.organizationId !== user.organizationId) {
    throw new Error("Inquiry not found or access denied");
  }

  await db.vehicleInquiry.update({
    where: { id },
    data: { ownerNotes: notes },
  });

  revalidatePath(`/admin/inquiries/${id}`);
  return { success: true };
}
