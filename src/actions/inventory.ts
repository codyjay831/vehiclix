"use server";

// SUPPORT MODE PROTECTION
// All mutations must call requireWriteAccess()
// Do not hardcode actorRole
// Use requireUserWithOrg()

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { VehicleStatus, Prisma, Role, MediaType } from "@prisma/client";
import { deleteFile, saveBuffer } from "@/lib/storage";
import { generateVehicleImageVariants } from "@/lib/images/vehicle-image-pipeline";

import { logAuditEvent } from "@/lib/audit";
import { getAuthenticatedUser, requireUserWithOrg } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
import { generateUniqueVehicleSlug } from "@/lib/vehicle-slug";
import { INTAKE_PLACEHOLDER_PRICE } from "@/lib/intake-draft-placeholders";

/**
 * Storage cleanup notes:
 * - Vehicle media delete: implemented in vehicle-media.ts (deleteVehicleMediaAction) — removes
 *   stored files via deleteStoredVehicleMediaFiles before/after DB delete as appropriate.
 * - Vehicle delete: There is no deleteVehicleAction; CASCADE would still orphan storage if added
 *   without calling the same storage helpers per media row.
 * - Document replace: Orphan cleanup is implemented in document.ts (uploadDocumentAction).
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

type VehicleMediaCreateRow = {
  id: string;
  mediaType: typeof MediaType.IMAGE;
  url: string;
  thumbUrl: string;
  cardUrl: string;
  galleryUrl: string;
  displayOrder: number;
};

/**
 * Runs Sharp variant pipeline + storage upload for vehicle listing images.
 * On failure after partial upload, deletes keys accumulated so far.
 */
async function buildVehicleMediaRowsFromImageFiles(
  vehicleId: string,
  files: File[],
  startDisplayOrder: number
): Promise<{ mediaRecords: VehicleMediaCreateRow[]; uploadedStorageKeys: string[] }> {
  const uploadedStorageKeys: string[] = [];
  const mediaRecords: VehicleMediaCreateRow[] = [];

  const cleanupUploadedKeys = async () => {
    await Promise.all(uploadedStorageKeys.map((key) => deleteFile(key).catch(() => undefined)));
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      if (file.type && !file.type.startsWith("image/")) {
        throw new Error("Only image files are supported for vehicle photos.");
      }
      const raw = Buffer.from(await file.arrayBuffer());
      const variants = await generateVehicleImageVariants(raw);
      const mediaId = randomUUID();
      const base = `${vehicleId}/${mediaId}`;

      const thumbKey = await saveBuffer(variants.thumb, {
        filename: `${base}/thumb.jpg`,
        contentType: "image/jpeg",
        isPublic: true,
      });
      uploadedStorageKeys.push(thumbKey);

      const cardKey = await saveBuffer(variants.card, {
        filename: `${base}/card.jpg`,
        contentType: "image/jpeg",
        isPublic: true,
      });
      uploadedStorageKeys.push(cardKey);

      const galleryKey = await saveBuffer(variants.gallery, {
        filename: `${base}/gallery.jpg`,
        contentType: "image/jpeg",
        isPublic: true,
      });
      uploadedStorageKeys.push(galleryKey);

      mediaRecords.push({
        id: mediaId,
        mediaType: MediaType.IMAGE,
        url: galleryKey,
        thumbUrl: thumbKey,
        cardUrl: cardKey,
        galleryUrl: galleryKey,
        displayOrder: startDisplayOrder + i,
      });
    } catch (err) {
      await cleanupUploadedKeys();
      throw err;
    }
  }

  return { mediaRecords, uploadedStorageKeys };
}

/**
 * Action to update an existing vehicle's fields.
 * New listing photos are appended via the same Sharp pipeline as create.
 */
export async function updateVehicleAction(vehicleId: string, formData: FormData) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }
  
  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, organizationId: user.organizationId },
    select: { 
      vehicleStatus: true, 
      organizationId: true,
      slug: true,
      organization: { select: { slug: true } }
    },
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

  const photoFiles = formData.getAll("photos").filter((f): f is File => f instanceof File);
  let appendedMedia: VehicleMediaCreateRow[] = [];
  let appendedUploadKeys: string[] = [];

  if (photoFiles.length > 0) {
    const maxRow = await db.vehicleMedia.aggregate({
      where: { vehicleId },
      _max: { displayOrder: true },
    });
    const startOrder = (maxRow._max.displayOrder ?? -1) + 1;
    const built = await buildVehicleMediaRowsFromImageFiles(vehicleId, photoFiles, startOrder);
    appendedMedia = built.mediaRecords;
    appendedUploadKeys = built.uploadedStorageKeys;
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.vehicle.update({
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
        select: { id: true },
      });

      if (appendedMedia.length > 0) {
        await tx.vehicleMedia.createMany({
          data: appendedMedia.map((r) => ({
            id: r.id,
            vehicleId,
            mediaType: r.mediaType,
            url: r.url,
            thumbUrl: r.thumbUrl,
            cardUrl: r.cardUrl,
            galleryUrl: r.galleryUrl,
            displayOrder: r.displayOrder,
          })),
        });
      }

      await logAuditEvent({
        eventType: "vehicle.updated",
        entityType: "Vehicle",
        entityId: vehicleId,
        organizationId: user.organizationId,
        actorId: user.id,
        actorRole: user.role,
        metadata: {
          changedFields: Array.from(formData.keys()),
          photosAppended: appendedMedia.length,
        },
      });
    });
  } catch (err) {
    if (appendedUploadKeys.length > 0) {
      await Promise.all(appendedUploadKeys.map((key) => deleteFile(key).catch(() => undefined)));
    }
    throw err;
  }

  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${vehicleId}/edit`);
  
  // Public Paths
  const orgSlug = vehicle.organization.slug;
  const publicId = vehicle.slug || vehicleId;
  revalidatePath(`/${orgSlug}/inventory/${publicId}`);
  revalidatePath(`/${orgSlug}/inventory`);
  revalidatePath(`/${orgSlug}`);
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
    select: { 
      vehicleStatus: true, 
      organizationId: true, 
      price: true,
      slug: true,
      organization: { select: { slug: true } }
    },
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
      select: { id: true },
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
  
  // Public Paths
  const orgSlug = vehicle.organization.slug;
  const publicId = vehicle.slug || vehicleId;
  revalidatePath(`/${orgSlug}/inventory/${publicId}`);
  revalidatePath(`/${orgSlug}/inventory`);
  revalidatePath(`/${orgSlug}`);
}

/**
 * Action to create a new vehicle.
 * Photo uploads run through the Sharp pipeline (thumb / card / gallery JPEGs) and persist variant keys.
 */
export async function createVehicleAction(formData: FormData) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }

  const status = formData.get("status") as VehicleStatus;

  const org = await db.organization.findUnique({
    where: { id: user.organizationId! },
    select: { slug: true },
  });
  if (!org) throw new Error("Organization not found");

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

  // Media: Sharp pipeline runs before the DB transaction (I/O + CPU outside transaction).
  // Keys uploaded here are best-effort deleted if the transaction fails (orphan mitigation).
  const photos = formData.getAll("photos") as File[];
  const vehicleId = randomUUID();
  const { mediaRecords, uploadedStorageKeys } = await buildVehicleMediaRowsFromImageFiles(
    vehicleId,
    photos,
    0
  );

  const cleanupUploadedKeys = async () => {
    await Promise.all(uploadedStorageKeys.map((key) => deleteFile(key).catch(() => undefined)));
  };

  const isPublishing = status === "LISTED";

  try {
    await db.$transaction(
      async (tx) => {
        const vehicle = await tx.vehicle.create({
          data: {
            id: vehicleId,
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
              create: mediaRecords,
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
          select: { id: true },
        });

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
      },
      {
        timeout: 20000,
      }
    );
  } catch (err) {
    await cleanupUploadedKeys();
    throw err;
  }

  revalidatePath("/admin/inventory");

  // Public Paths
  if (isPublishing) {
    revalidatePath(`/${org.slug}/inventory`);
    revalidatePath(`/${org.slug}`);
  }

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
