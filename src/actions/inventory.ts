"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { VehicleStatus, Prisma, Role, MediaType } from "@prisma/client";
import { getStorageProvider } from "@/lib/storage";

import { logAuditEvent } from "@/lib/audit";
import { getAuthenticatedUser, requireUserWithOrg } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
import { generateUniqueVehicleSlug } from "@/lib/vehicle-slug";
import { INTAKE_PLACEHOLDER_PRICE } from "@/lib/intake-draft-placeholders";

/**
 * STORAGE CLEANUP GAP (documented — not fixed in this pass):
 * - Vehicle delete: There is no deleteVehicleAction in this codebase. If one is added, or if
 *   vehicles/media are deleted via DB (CASCADE removes VehicleMedia rows), storage files are
 *   NOT removed. Safe fix: when implementing vehicle/media delete, fetch media URLs and call
 *   deleteFile() from @/lib/storage for each before deleting DB rows.
 * - Document replace: Orphan cleanup is already implemented in document.ts (uploadDocumentAction
 *   deletes the previous file when a document is re-uploaded).
 * - Adding a broad background cleanup job would require design (e.g. list bucket vs DB keys);
 *   prefer targeted cleanup at delete time when those flows exist.
 */

const LOCKED_STATUSES: VehicleStatus[] = ["RESERVED", "UNDER_CONTRACT", "SOLD"];

/**
 * Validates if a VIN is unique across all vehicles, excluding a specific vehicle ID.
 */
export async function isVinUnique(vin: string, excludeId?: string): Promise<boolean> {
  const existing = await db.vehicle.findUnique({
    where: { vin },
    select: { id: true },
  });
  
  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;
  
  return false;
}

/**
 * Action to update an existing vehicle's fields.
 * Media management is excluded from this pass.
 */
export async function updateVehicleAction(vehicleId: string, formData: FormData) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }
  
  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, organizationId: user.organizationId },
    select: { vehicleStatus: true, organizationId: true },
  });

  if (!vehicle) {
    throw new Error("Vehicle not found or access denied");
  }
  if (LOCKED_STATUSES.includes(vehicle.vehicleStatus)) {
    throw new Error(`Vehicle is in ${vehicle.vehicleStatus} status and cannot be edited.`);
  }

  // 1. Basic Identification
  const vin = formData.get("vin") as string;
  const year = parseInt(formData.get("year") as string);
  const make = formData.get("make") as string;
  const model = formData.get("model") as string;
  const trim = (formData.get("trim") as string)?.trim() || null;

  // 2. Specs (Phase 2 optional fields)
  const bodyStyle = (formData.get("bodyStyle") as string)?.trim() || null;
  const fuelType = (formData.get("fuelType") as string)?.trim() || null;
  const transmission = (formData.get("transmission") as string)?.trim() || null;
  const doorsRaw = formData.get("doors");
  const doors = doorsRaw != null && String(doorsRaw).trim() !== ""
    ? (() => { const n = parseInt(String(doorsRaw).trim(), 10); return (Number.isNaN(n) || n < 2 || n > 5) ? null : n; })()
    : null;

  const mileage = parseInt(formData.get("mileage") as string);
  const drivetrain = formData.get("drivetrain") as any;
  const batteryRange = formData.get("batteryRange")
    ? parseInt(formData.get("batteryRange") as string)
    : null;
  const batteryCapacityKWhRaw = formData.get("batteryCapacityKWh");
  const batteryCapacityKWh = batteryCapacityKWhRaw != null && String(batteryCapacityKWhRaw).trim() !== ""
    ? (() => { const n = parseFloat(String(batteryCapacityKWhRaw).trim()); return Number.isNaN(n) || n < 0 ? null : n; })()
    : null;
  const batteryChemistry = (formData.get("batteryChemistry") as string)?.trim() || null;
  const chargingStandard = (formData.get("chargingStandard") as string)?.trim() || null;
  const exteriorColor = formData.get("exteriorColor") as string;
  const interiorColor = formData.get("interiorColor") as string;

  // 3. Condition
  const condition = formData.get("condition") as any;
  const titleStatus = formData.get("titleStatus") as any;

  // 4. Pricing
  const price = new Prisma.Decimal(formData.get("price") as string);

  // 5. Marketing
  const description = (formData.get("description") as string) || null;
  const highlights = formData.getAll("highlights").filter(Boolean) as string[];
  const features = formData.getAll("features").filter(Boolean) as string[];

  // 6. Internal
  const internalNotes = (formData.get("internalNotes") as string) || null;

  // Validation
  if (!vin || !year || !make || !model) {
    throw new Error("Missing identification fields");
  }

  const vinIsUnique = await isVinUnique(vin, vehicleId);
  if (!vinIsUnique) {
    throw new Error("A vehicle with this VIN already exists");
  }

  await db.$transaction(async (tx) => {
    const updatedVehicle = await tx.vehicle.update({
      where: { id: vehicleId },
      data: {
        vin,
        year,
        make,
        model,
        trim,
        bodyStyle,
        fuelType,
        transmission,
        doors,
        mileage,
        drivetrain,
        batteryRangeEstimate: batteryRange,
        batteryCapacityKWh,
        batteryChemistry,
        chargingStandard,
        exteriorColor,
        interiorColor,
        condition,
        titleStatus,
        price,
        description,
        highlights,
        features,
        internalNotes,
      },
    });

    await logAuditEvent({
      eventType: "vehicle.updated",
      entityType: "Vehicle",
      entityId: vehicleId,
      organizationId: user.organizationId,
      actorId: user.id,
      actorRole: user.role,
      metadata: { changedFields: Array.from(formData.keys()) },
    });

    return updatedVehicle;
  });

  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${vehicleId}/edit`);
  revalidatePath(`/inventory/${vehicleId}`);
}

/**
 * Action to update only the status of a vehicle.
 * Only allows transitions between DRAFT, LISTED, and ARCHIVED.
 */
export async function updateVehicleStatusAction(vehicleId: string, newStatus: VehicleStatus) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, organizationId: user.organizationId },
    select: { vehicleStatus: true, organizationId: true, price: true },
  });

  if (!vehicle) {
    throw new Error("Vehicle not found or access denied");
  }

  const allowedStatuses: VehicleStatus[] = ["DRAFT", "LISTED", "ARCHIVED", "SOLD"];
  
  if (!allowedStatuses.includes(vehicle.vehicleStatus)) {
    throw new Error(`Manual status changes are not allowed for vehicles in ${vehicle.vehicleStatus} status.`);
  }

  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(`Status ${newStatus} is not a valid target for manual transition.`);
  }

  if (newStatus === "LISTED" && vehicle.vehicleStatus === "DRAFT") {
    if (vehicle.price.equals(new Prisma.Decimal(INTAKE_PLACEHOLDER_PRICE))) {
      throw new Error("Set a listing price on the vehicle before publishing to the showroom.");
    }
  }

  await db.$transaction(async (tx) => {
    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { vehicleStatus: newStatus },
    });

    await logAuditEvent({
      eventType: "vehicle.status_changed",
      entityType: "Vehicle",
      entityId: vehicleId,
      organizationId: user.organizationId,
      actorId: user.id,
      actorRole: user.role,
      metadata: { from: vehicle.vehicleStatus, to: newStatus },
    });
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${vehicleId}`);
}

/**
 * Action to create a new vehicle.
 * Handles photo uploads to local storage and database persistence.
 */
export async function createVehicleAction(formData: FormData) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  const status = formData.get("status") as VehicleStatus;

  // 1. Basic Identification
  const vin = formData.get("vin") as string;
  const year = parseInt(formData.get("year") as string);
  const make = formData.get("make") as string;
  const model = formData.get("model") as string;
  const trim = (formData.get("trim") as string)?.trim() || null;

  // 2. Specs (Phase 2 optional fields)
  const bodyStyle = (formData.get("bodyStyle") as string)?.trim() || null;
  const fuelType = (formData.get("fuelType") as string)?.trim() || null;
  const transmission = (formData.get("transmission") as string)?.trim() || null;
  const doorsRaw = formData.get("doors");
  const doors = doorsRaw != null && String(doorsRaw).trim() !== ""
    ? (() => { const n = parseInt(String(doorsRaw).trim(), 10); return (Number.isNaN(n) || n < 2 || n > 5) ? null : n; })()
    : null;

  const mileage = parseInt(formData.get("mileage") as string);
  const drivetrain = formData.get("drivetrain") as any;
  const batteryRange = formData.get("batteryRange")
    ? parseInt(formData.get("batteryRange") as string)
    : null;
  const batteryCapacityKWhRaw = formData.get("batteryCapacityKWh");
  const batteryCapacityKWh = batteryCapacityKWhRaw != null && String(batteryCapacityKWhRaw).trim() !== ""
    ? (() => { const n = parseFloat(String(batteryCapacityKWhRaw).trim()); return Number.isNaN(n) || n < 0 ? null : n; })()
    : null;
  const batteryChemistry = (formData.get("batteryChemistry") as string)?.trim() || null;
  const chargingStandard = (formData.get("chargingStandard") as string)?.trim() || null;
  const exteriorColor = formData.get("exteriorColor") as string;
  const interiorColor = formData.get("interiorColor") as string;

  // 3. Condition
  const condition = formData.get("condition") as any;
  const titleStatus = formData.get("titleStatus") as any;

  // 4. Pricing
  const priceString = formData.get("price") as string;
  const price = priceString ? new Prisma.Decimal(priceString) : new Prisma.Decimal(0);

  // 5. Marketing
  const description = (formData.get("description") as string) || null;
  const highlights = formData.getAll("highlights").filter(Boolean) as string[];
  const features = formData.getAll("features").filter(Boolean) as string[];

  // 6. Internal
  const internalNotes = (formData.get("internalNotes") as string) || null;

  // Media
  const photos = formData.getAll("photos") as File[];
  const storage = getStorageProvider();
  
  const mediaRecords = await Promise.all(
    photos.map(async (file, index) => {
      const key = await storage.save(file, { isPublic: true });
      return {
        mediaType: MediaType.IMAGE,
        url: key,
        displayOrder: index,
      };
    })
  );

  const isPublishing = status === "LISTED";

  // Database Transaction
  await db.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.create({
      data: {
        vin,
        year,
        make,
        model,
        trim,
        bodyStyle,
        fuelType,
        transmission,
        doors,
        mileage,
        drivetrain,
        batteryRangeEstimate: batteryRange,
        batteryCapacityKWh,
        batteryChemistry,
        chargingStandard,
        exteriorColor,
        interiorColor,
        condition,
        titleStatus,
        price,
        description,
        highlights,
        features,
        internalNotes,
        vehicleStatus: status,
        organizationId: user.organizationId!,
        media: {
          createMany: {
            data: mediaRecords,
          },
        },
      },
    });

    const slug = await generateUniqueVehicleSlug(tx, user.organizationId!, {
      id: vehicle.id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
    });
    await tx.vehicle.update({
      where: { id: vehicle.id },
      data: { slug },
    });

    // Create audit event
    await tx.activityEvent.create({
      data: {
        eventType: isPublishing ? "vehicle.published" : "vehicle.created",
        entityType: "Vehicle",
        entityId: vehicle.id,
        organizationId: user.organizationId!,
        actorId: user.id,
        actorRole: user.role,
        metadata: { status: vehicle.vehicleStatus },
      },
    });
  });

  revalidatePath("/admin/inventory");
  redirect("/admin/inventory");
}

/**
 * Increments the view count for a vehicle.
 */
export async function trackVehicleViewAction(vehicleId: string, organizationId: string) {
  // Public action, but also used in Admin UI.
  // We check if a session exists to potentially block Support Mode from incrementing metrics.
  const user = await getAuthenticatedUser();
  if (user?.isSupportMode) return;

  // Context must be validated
  await db.vehicle.updateMany({
    where: { id: vehicleId, organizationId, vehicleStatus: "LISTED" },
    data: { views: { increment: 1 } },
  });
}

/**
 * Increments the share count for a vehicle.
 */
export async function trackVehicleShareAction(vehicleId: string, organizationId: string) {
  // Public action, but also used in Admin UI.
  // We check if a session exists to potentially block Support Mode from incrementing metrics.
  const user = await getAuthenticatedUser();
  if (user?.isSupportMode) return;

  // Context must be validated
  await db.vehicle.updateMany({
    where: { id: vehicleId, organizationId, vehicleStatus: "LISTED" },
    data: { shares: { increment: 1 } },
  });
  
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${vehicleId}`);
}
