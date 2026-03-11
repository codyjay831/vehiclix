"use server";

import { db } from "@/lib/db";
import { VehicleRequestStatus, Role, Prisma, Priority } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/auth";

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

  // Create Vehicle Request
  const request = await db.vehicleRequest.create({
    data: {
      userId: user.id,
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
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.OWNER) {
    throw new Error("Unauthorized: Owner access required");
  }

  const request = await db.vehicleRequest.findUnique({
    where: { id },
    select: { requestStatus: true },
  });

  if (!request) {
    throw new Error("Request not found");
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
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.OWNER) {
    throw new Error("Unauthorized: Owner access required");
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
  const user = await getAuthenticatedUser();
  if (!user || user.role !== Role.OWNER) {
    throw new Error("Unauthorized: Owner access required");
  }

  await db.vehicleRequest.update({
    where: { id },
    data: { ownerNotes: notes },
  });

  revalidatePath(`/admin/requests/${id}`);
  return { success: true };
}
