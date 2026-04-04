import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildVehiclePhotosZipBuffer,
  buildVehicleZipBaseName,
  buildZipEntryNames,
  MAX_VEHICLE_PHOTOS_ZIP_ENTRIES,
  pickExportStorageKey,
  type ZipBuildEntry,
} from "@/lib/vehicle-photo-zip";

export const runtime = "nodejs";

/**
 * GET /api/admin/inventory/[vehicleId]/photos-zip
 * Authenticated dealer/staff (or support-mode super-admin): ZIP of optimized photos (gallery, else url).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await params;
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (user.role === Role.CUSTOMER) {
    return NextResponse.json({ error: "You don’t have access to this." }, { status: 403 });
  }

  if (
    user.role !== Role.OWNER &&
    user.role !== Role.STAFF &&
    !(user.role === Role.SUPER_ADMIN && user.isSupportMode)
  ) {
    return NextResponse.json({ error: "You don’t have access to this." }, { status: 403 });
  }

  const organizationId = user.isSupportMode ? user.supportOrgId : user.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "You don’t have access to this." }, { status: 403 });
  }

  const vehicle = await db.vehicle.findFirst({
    where: { id: vehicleId, organizationId },
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      media: {
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: {
          galleryUrl: true,
          url: true,
        },
      },
    },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  }

  const ordered = vehicle.media
    .map((m) => pickExportStorageKey(m))
    .filter((k): k is string => Boolean(k));

  if (ordered.length === 0) {
    return NextResponse.json(
      { error: "This vehicle has no photos to download yet." },
      { status: 400 }
    );
  }

  if (ordered.length > MAX_VEHICLE_PHOTOS_ZIP_ENTRIES) {
    return NextResponse.json(
      { error: "Too many photos to download at once. Contact support if you need a larger export." },
      { status: 400 }
    );
  }

  const baseName = buildVehicleZipBaseName(vehicle);
  const names = buildZipEntryNames(baseName, ordered);
  const entries: ZipBuildEntry[] = ordered.map((storageKey, i) => ({
    storageKey,
    entryName: names[i] ?? `photo-${String(i + 1).padStart(2, "0")}.jpg`,
  }));

  try {
    const zipBuffer = await buildVehiclePhotosZipBuffer(entries);
    const zipFileName = `${baseName}-photos.zip`;
    const asciiName = zipFileName.replace(/"/g, "");
    const contentDisposition = `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(asciiName)}`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDisposition,
        "Content-Length": String(zipBuffer.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "NO_IMAGES") {
      return NextResponse.json(
        { error: "Could not read any of these photos. Try again or contact support." },
        { status: 400 }
      );
    }
    console.error("[photos-zip] zip_failed", { vehicleId }, e);
    return NextResponse.json(
      { error: "Something went wrong preparing the download. Please try again." },
      { status: 500 }
    );
  }
}
