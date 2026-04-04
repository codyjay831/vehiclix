"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Role, VehicleStatus } from "@prisma/client";
import { requireUserWithOrg } from "@/lib/auth";
import { requireWriteAccess } from "@/lib/support";
import { logAuditEvent } from "@/lib/audit";
import { deleteStoredVehicleMediaFiles } from "@/lib/vehicle-media-storage";

const LOCKED_STATUSES: VehicleStatus[] = ["RESERVED", "UNDER_CONTRACT", "SOLD"];

type VehicleForRevalidate = {
  slug: string | null;
  organization: { slug: string };
};

async function getEditableVehicleForOrg(
  vehicleId: string,
  organizationId: string
): Promise<(VehicleForRevalidate & { vehicleStatus: VehicleStatus }) | null> {
  return db.vehicle.findFirst({
    where: { id: vehicleId, organizationId },
    select: {
      vehicleStatus: true,
      slug: true,
      organization: { select: { slug: true } },
    },
  });
}

function revalidateAfterVehicleMediaChange(vehicleId: string, v: VehicleForRevalidate) {
  const orgSlug = v.organization.slug;
  const publicId = v.slug || vehicleId;
  revalidatePath("/admin/inventory");
  revalidatePath(`/admin/inventory/${vehicleId}/edit`);
  revalidatePath(`/${orgSlug}/inventory/${publicId}`);
  revalidatePath(`/${orgSlug}/inventory`);
  revalidatePath(`/${orgSlug}`);
}

function assertMediaRole(user: { role: Role; isSupportMode?: boolean }) {
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    throw new Error("Unauthorized");
  }
}

async function validateOrderedIdsAgainstVehicle(vehicleId: string, orderedIds: string[]) {
  const existing = await db.vehicleMedia.findMany({
    where: { vehicleId },
    select: { id: true },
  });
  const set = new Set(existing.map((e) => e.id));
  if (orderedIds.length !== set.size) {
    throw new Error("Photo order is invalid or out of date. Refresh and try again.");
  }
  for (const id of orderedIds) {
    if (!set.has(id)) {
      throw new Error("Photo order is invalid or out of date. Refresh and try again.");
    }
  }
}

async function persistDisplayOrder(vehicleId: string, orderedIds: string[]) {
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.vehicleMedia.update({
        where: { id, vehicleId },
        data: { displayOrder: index },
      })
    )
  );
}

export async function deleteVehicleMediaAction(vehicleId: string, mediaId: string) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  assertMediaRole(user);

  const vehicle = await getEditableVehicleForOrg(vehicleId, user.organizationId);
  if (!vehicle) {
    throw new Error("Vehicle not found or access denied");
  }
  if (LOCKED_STATUSES.includes(vehicle.vehicleStatus)) {
    throw new Error(`Vehicle is in ${vehicle.vehicleStatus} status and cannot be edited.`);
  }

  const row = await db.vehicleMedia.findFirst({
    where: { id: mediaId, vehicleId },
    select: { id: true, url: true, thumbUrl: true, cardUrl: true, galleryUrl: true },
  });
  if (!row) {
    throw new Error("Photo not found");
  }

  await db.$transaction(async (tx) => {
    await tx.vehicleMedia.delete({ where: { id: mediaId } });
    const remaining = await tx.vehicleMedia.findMany({
      where: { vehicleId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, displayOrder: true },
    });
    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i]!;
      if (r.displayOrder !== i) {
        await tx.vehicleMedia.update({
          where: { id: r.id },
          data: { displayOrder: i },
        });
      }
    }
  });

  await deleteStoredVehicleMediaFiles(row);

  await logAuditEvent({
    eventType: "vehicle.updated",
    entityType: "Vehicle",
    entityId: vehicleId,
    organizationId: user.organizationId,
    actorId: user.id,
    actorRole: user.role,
    metadata: { vehicleMediaDeleted: mediaId },
  });

  revalidateAfterVehicleMediaChange(vehicleId, vehicle);
}

export async function reorderVehicleMediaAction(vehicleId: string, orderedIds: string[]) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  assertMediaRole(user);

  const vehicle = await getEditableVehicleForOrg(vehicleId, user.organizationId);
  if (!vehicle) {
    throw new Error("Vehicle not found or access denied");
  }
  if (LOCKED_STATUSES.includes(vehicle.vehicleStatus)) {
    throw new Error(`Vehicle is in ${vehicle.vehicleStatus} status and cannot be edited.`);
  }

  await validateOrderedIdsAgainstVehicle(vehicleId, orderedIds);

  await persistDisplayOrder(vehicleId, orderedIds);

  await logAuditEvent({
    eventType: "vehicle.updated",
    entityType: "Vehicle",
    entityId: vehicleId,
    organizationId: user.organizationId,
    actorId: user.id,
    actorRole: user.role,
    metadata: { vehicleMediaReordered: true, count: orderedIds.length },
  });

  revalidateAfterVehicleMediaChange(vehicleId, vehicle);
}

export async function makePrimaryVehicleMediaAction(vehicleId: string, mediaId: string) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  assertMediaRole(user);

  const vehicle = await getEditableVehicleForOrg(vehicleId, user.organizationId);
  if (!vehicle) {
    throw new Error("Vehicle not found or access denied");
  }
  if (LOCKED_STATUSES.includes(vehicle.vehicleStatus)) {
    throw new Error(`Vehicle is in ${vehicle.vehicleStatus} status and cannot be edited.`);
  }

  const rows = await db.vehicleMedia.findMany({
    where: { vehicleId },
    orderBy: { displayOrder: "asc" },
    select: { id: true },
  });
  const ids = rows.map((r) => r.id);
  if (!ids.includes(mediaId)) {
    throw new Error("Photo not found");
  }

  const reordered = [mediaId, ...ids.filter((id) => id !== mediaId)];
  await validateOrderedIdsAgainstVehicle(vehicleId, reordered);

  await persistDisplayOrder(vehicleId, reordered);

  await logAuditEvent({
    eventType: "vehicle.updated",
    entityType: "Vehicle",
    entityId: vehicleId,
    organizationId: user.organizationId,
    actorId: user.id,
    actorRole: user.role,
    metadata: { vehicleMediaPrimarySet: mediaId },
  });

  revalidateAfterVehicleMediaChange(vehicleId, vehicle);
}
