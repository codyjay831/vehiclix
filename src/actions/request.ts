"use server";

import { db } from "@/lib/db";
import { VehicleRequestStatus, Role, Priority, LeadSource } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserWithOrg } from "@/lib/auth";
import { ensureLeadForInbound } from "@/lib/crm";

interface VehicleRequestData {
  organizationId: string;
  make: string;
  model: string;
  yearMin?: number;
  yearMax?: number;
  trim?: string;
  mileageMax?: number;
  colorPrefs?: string;
  features?: string;
  budgetMax: number;
  timeline?: string;
  financingInterest: boolean;
  tradeInInterest: boolean;
  notes?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/**
 * Handles sourcing request submissions.
 */
export async function submitVehicleRequestAction(data: VehicleRequestData) {
  const {
    organizationId,
    make,
    model,
    yearMin,
    yearMax,
    trim,
    mileageMax,
    colorPrefs,
    features,
    budgetMax,
    timeline,
    financingInterest,
    tradeInInterest,
    notes,
    firstName,
    lastName,
    email,
    phone,
  } = data;

  if (!organizationId) {
    throw new Error("Organization context is required");
  }

  // 1. Validate organization exists
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    throw new Error("Invalid organization context");
  }

  // 2. Identity Resolution (Stub Account)
  let user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, organizationId: true },
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
        organizationId: org.id,
      },
    });
  } else if (!user.organizationId) {
    user = await db.user.update({
      where: { id: user.id },
      data: { organizationId: org.id },
    });
  }

  // 3. Create Vehicle Request
  const request = await db.vehicleRequest.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      make,
      model,
      yearMin,
      yearMax,
      budgetMax,
      mileageMax,
      colorPrefs,
      features,
      timeline,
      financingInterest,
      tradeInInterest,
      notes,
      requestStatus: VehicleRequestStatus.SUBMITTED,
    },
  });

  // 4. Feed the CRM Lead Pipeline
  await ensureLeadForInbound({
    organizationId: org.id,
    source: LeadSource.VEHICLE_REQUEST,
    customerEmail: email.toLowerCase(),
    customerName: `${firstName} ${lastName}`,
    customerPhone: phone,
    customerId: user.id,
    initialActivityBody: `Vehicle sourcing request received for ${make} ${model}. Budget: $${budgetMax.toLocaleString()}.`,
  });

  // 5. Log Activity Event
  await db.activityEvent.create({
    data: {
      eventType: "request.submitted",
      entityType: "VehicleRequest",
      entityId: request.id,
      organizationId: org.id,
      actorId: user.id,
      actorRole: Role.CUSTOMER,
      metadata: {
        make,
        model,
        budgetMax,
      },
    },
  });

  redirect("/request-vehicle/confirmation");
}

/**
 * Updates a vehicle request's status and logs the event.
 */
export async function updateRequestStatusAction(id: string, newStatus: VehicleRequestStatus) {
  const user = await requireUserWithOrg();

  const request = await db.vehicleRequest.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { requestStatus: true, organizationId: true },
  });

  if (!request) {
    throw new Error("Request not found or access denied");
  }

  const currentStatus = request.requestStatus;
  const validTransitions: Record<VehicleRequestStatus, VehicleRequestStatus[]> = {
    [VehicleRequestStatus.SUBMITTED]: [VehicleRequestStatus.UNDER_REVIEW, VehicleRequestStatus.CLOSED],
    [VehicleRequestStatus.UNDER_REVIEW]: [VehicleRequestStatus.SOURCING, VehicleRequestStatus.CLOSED],
    [VehicleRequestStatus.SOURCING]: [VehicleRequestStatus.CLOSED],
    [VehicleRequestStatus.VEHICLE_PROPOSED]: [], 
    [VehicleRequestStatus.CUSTOMER_APPROVED]: [], 
    [VehicleRequestStatus.CONVERTED_TO_DEAL]: [], 
    [VehicleRequestStatus.CLOSED]: [], 
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }

  let eventType = "";
  if (newStatus === VehicleRequestStatus.UNDER_REVIEW) eventType = "request.reviewed";
  if (newStatus === VehicleRequestStatus.SOURCING) eventType = "request.sourcing_started";
  if (newStatus === VehicleRequestStatus.CLOSED) eventType = "request.closed";

  await db.$transaction([
    db.vehicleRequest.update({
      where: { id },
      data: { requestStatus: newStatus },
    }),
    ...(eventType
      ? [
          db.activityEvent.create({
            data: {
              eventType,
              entityType: "VehicleRequest",
              entityId: id,
              organizationId: user.organizationId,
              actorRole: Role.OWNER,
              metadata: { previousStatus: currentStatus },
            },
          }),
        ]
      : []),
  ]);

  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${id}`);
  return { success: true };
}

/**
 * Updates the internal priority of a vehicle request.
 */
export async function updateRequestPriorityAction(id: string, priority: Priority) {
  const user = await requireUserWithOrg();

  const request = await db.vehicleRequest.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { organizationId: true },
  });

  if (!request) {
    throw new Error("Request not found or access denied");
  }

  await db.vehicleRequest.update({
    where: { id },
    data: { priority },
  });

  revalidatePath(`/admin/requests/${id}`);
  return { success: true };
}

/**
 * Updates the owner's internal notes for a vehicle request.
 */
export async function updateRequestNotesAction(id: string, notes: string) {
  const user = await requireUserWithOrg();

  const request = await db.vehicleRequest.findFirst({
    where: { id, organizationId: user.organizationId },
    select: { organizationId: true },
  });

  if (!request) {
    throw new Error("Request not found or access denied");
  }

  await db.vehicleRequest.update({
    where: { id },
    data: { ownerNotes: notes },
  });

  revalidatePath(`/admin/requests/${id}`);
  return { success: true };
}
