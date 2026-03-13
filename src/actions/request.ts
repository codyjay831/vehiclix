"use server";

import { db } from "@/lib/db";
import { VehicleRequestStatus, Role, Prisma, Priority } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser, requireUserWithOrg } from "@/lib/auth";
import { getDefaultOrganization } from "@/lib/organization";

interface VehicleRequestData {
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
    firstName,
    lastName,
    email,
    phone,
  } = data;

  // Identity Resolution (Stub Account)
  let user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, organizationId: true },
  });

  // Resolve organization (default for Phase 2)
  const org = await getDefaultOrganization();

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
    // If an existing stub account is missing an organization, assign it based on this request
    user = await db.user.update({
      where: { id: user.id },
      data: { organizationId: org.id },
    });
  }

  // Create Vehicle Request
  const request = await db.vehicleRequest.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      make,
      model,
      yearMin,
      yearMax,
      budgetMax: new Prisma.Decimal(budgetMax),
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

  // Log Activity Event
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

  const request = await db.vehicleRequest.findUnique({
    where: { id },
    select: { requestStatus: true, organizationId: true },
  });

  if (!request || request.organizationId !== user.organizationId) {
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

  const request = await db.vehicleRequest.findUnique({
    where: { id },
    select: { organizationId: true },
  });

  if (!request || request.organizationId !== user.organizationId) {
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

  const request = await db.vehicleRequest.findUnique({
    where: { id },
    select: { organizationId: true },
  });

  if (!request || request.organizationId !== user.organizationId) {
    throw new Error("Request not found or access denied");
  }

  await db.vehicleRequest.update({
    where: { id },
    data: { ownerNotes: notes },
  });

  revalidatePath(`/admin/requests/${id}`);
  return { success: true };
}
