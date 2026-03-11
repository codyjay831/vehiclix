"use server";

import { db } from "@/lib/db";
import { ContactMethod, InquiryStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";

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
  });

  if (!user) {
    user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        phone,
        role: Role.CUSTOMER,
        isStub: true,
      },
    });
  }

  // Create Inquiry
  await db.vehicleInquiry.create({
    data: {
      vehicleId,
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

  return { success: true };
}

/**
 * Updates an inquiry's status and logs the event.
 */
export async function updateInquiryStatusAction(id: string, newStatus: InquiryStatus) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.OWNER) {
    throw new Error("Unauthorized: Owner access required");
  }

  const inquiry = await db.vehicleInquiry.findUnique({
    where: { id },
    select: { inquiryStatus: true, userId: true },
  });

  if (!inquiry) {
    throw new Error("Inquiry not found");
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
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.OWNER) {
    throw new Error("Unauthorized: Owner access required");
  }

  await db.vehicleInquiry.update({
    where: { id },
    data: { ownerNotes: notes },
  });

  revalidatePath(`/admin/inquiries/${id}`);
  return { success: true };
}
