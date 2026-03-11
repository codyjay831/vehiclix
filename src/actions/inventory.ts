"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { VehicleStatus, Prisma } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { logAuditEvent } from "@/lib/audit";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "inventory");

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
  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
    select: { vehicleStatus: true },
  });

  if (!vehicle) throw new Error("Vehicle not found");
  if (LOCKED_STATUSES.includes(vehicle.vehicleStatus)) {
    throw new Error(`Vehicle is in ${vehicle.vehicleStatus} status and cannot be edited.`);
  }

  // 1. Basic Identification
  const vin = formData.get("vin") as string;
  const year = parseInt(formData.get("year") as string);
  const make = formData.get("make") as string;
  const model = formData.get("model") as string;
  const trim = (formData.get("trim") as string) || null;

  // 2. Specs
  const mileage = parseInt(formData.get("mileage") as string);
  const drivetrain = formData.get("drivetrain") as any;
  const batteryRange = formData.get("batteryRange")
    ? parseInt(formData.get("batteryRange") as string)
    : null;
  const exteriorColor = formData.get("exteriorColor") as string;
  const interiorColor = formData.get("interiorColor") as string;

  // 3. Condition
  const condition = formData.get("condition") as any;
  const titleStatus = formData.get("titleStatus") as any;
  const conditionNotes = (formData.get("conditionNotes") as string) || null;

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
        mileage,
        drivetrain,
        batteryRangeEstimate: batteryRange,
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
      actorRole: "OWNER",
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
  const vehicle = await db.vehicle.findUnique({
    where: { id: vehicleId },
    select: { vehicleStatus: true },
  });

  if (!vehicle) throw new Error("Vehicle not found");

  const allowedStatuses: VehicleStatus[] = ["DRAFT", "LISTED", "ARCHIVED"];
  
  if (!allowedStatuses.includes(vehicle.vehicleStatus)) {
    throw new Error(`Manual status changes are not allowed for vehicles in ${vehicle.vehicleStatus} status.`);
  }

  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(`Status ${newStatus} is not a valid target for manual transition.`);
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
      actorRole: "OWNER",
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
  const status = formData.get("status") as VehicleStatus;
  const isPublishing = status === "LISTED";

  // 1. Basic Identification (Required for both Draft and Published)
  const vin = formData.get("vin") as string;
  const year = parseInt(formData.get("year") as string);
  const make = formData.get("make") as string;
  const model = formData.get("model") as string;
  const trim = formData.get("trim") as string || null;

  // 2. Specs (Required for both)
  const mileage = parseInt(formData.get("mileage") as string);
  const drivetrain = formData.get("drivetrain") as any;
  const batteryRange = formData.get("batteryRange") ? parseInt(formData.get("batteryRange") as string) : null;
  const exteriorColor = formData.get("exteriorColor") as string;
  const interiorColor = formData.get("interiorColor") as string;

  // 3. Condition (Required for both)
  const condition = formData.get("condition") as any;
  const titleStatus = formData.get("titleStatus") as any;
  const conditionNotes = formData.get("conditionNotes") as string || null;

  // 4. Pricing (Required for both)
  const price = new Prisma.Decimal(formData.get("price") as string);

  // 5. Marketing (Optional for Draft, Required for Publish)
  const description = formData.get("description") as string || null;
  const highlights = formData.getAll("highlights").filter(Boolean) as string[];
  const features = formData.getAll("features").filter(Boolean) as string[];

  // 6. Internal
  const internalNotes = formData.get("internalNotes") as string || null;

  // 7. Photos
  const photos = formData.getAll("photos") as File[];
  const validPhotos = photos.filter((file) => file.size > 0);

  // Validation
  if (!vin || !year || !make || !model) {
    throw new Error("Missing identification fields");
  }

  const vinExists = await db.vehicle.findUnique({ where: { vin } });
  if (vinExists) {
    throw new Error("A vehicle with this VIN already exists");
  }

  if (isPublishing) {
    if (!description) throw new Error("Description is required to publish");
    if (validPhotos.length === 0) throw new Error("At least one photo is required to publish");
  }

  // Handle Photo Storage
  const mediaRecords: { url: string; displayOrder: number; mediaType: "IMAGE" }[] = [];

  for (let i = 0; i < validPhotos.length; i++) {
    const file = validPhotos[i];
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${uuidv4()}-${file.name.replace(/\s+/g, "-")}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    await fs.writeFile(filePath, buffer);
    mediaRecords.push({
      url: `/uploads/inventory/${fileName}`,
      displayOrder: i,
      mediaType: "IMAGE",
    });
  }

  // Database Transaction
  await db.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.create({
      data: {
        vin,
        year,
        make,
        model,
        trim,
        mileage,
        drivetrain,
        batteryRangeEstimate: batteryRange,
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
        media: {
          createMany: {
            data: mediaRecords,
          },
        },
      },
    });

    // Create audit event
    await tx.activityEvent.create({
      data: {
        eventType: isPublishing ? "vehicle.published" : "vehicle.created",
        entityType: "Vehicle",
        entityId: vehicle.id,
        actorRole: "OWNER",
        metadata: { status: vehicle.vehicleStatus },
      },
    });
  });

  revalidatePath("/admin/inventory");
  redirect("/admin/inventory");
}
