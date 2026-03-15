"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { db } from "@/lib/db";
import { ContactMethod, InquiryStatus, Role, LeadSource } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser, requireUserWithOrg } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
import { notifyDealerOfLead } from "@/lib/notifications";
import { ensureLeadForInbound } from "@/lib/crm";

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
  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, vehicleStatus: "LISTED" },
    select: { organizationId: true, year: true, make: true, model: true },
  });

  if (!vehicle) {
    throw new Error("Vehicle not found or no longer available");
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

  // NEW: Feed the CRM Lead Pipeline
  await ensureLeadForInbound({
    organizationId: vehicle.organizationId,
    source: LeadSource.INQUIRY,
    customerEmail: email.toLowerCase(),
    customerName: `${firstName} ${lastName}`,
    customerPhone: phone,
    vehicleId,
    customerId: user.id,
    initialActivityBody: `Vehicle inquiry received for ${vehicleInfo}.${message ? ` Message: ${message}` : ""}`,
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
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  const inquiry = await db.vehicleInquiry.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { inquiryStatus: true, userId: true, organizationId: true },
  });

  if (!inquiry) {
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
              actorId: user.id,
              actorRole: user.role,
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
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  const inquiry = await db.vehicleInquiry.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { organizationId: true },
  });

  if (!inquiry) {
    throw new Error("Inquiry not found or access denied");
  }

  await db.vehicleInquiry.update({
    where: { id },
    data: { ownerNotes: notes },
  });

  revalidatePath(`/admin/inquiries/${id}`);
  return { success: true };
}
