import { db } from "./db";
import type { VehicleWithMedia } from "@/lib/prisma/vehicle-safe-select";
import { Prisma, VehicleStatus } from "@prisma/client";
import { getPublicUrl } from "@/lib/storage";

function enrichMediaKey(key: string | null | undefined): string | null {
  if (key == null) return null;
  const t = String(key).trim();
  if (!t) return null;
  return getPublicUrl(t);
}
import {
  buildVehicleInventorySelect,
  vehicleForEditSelect,
  vehicleWithMediaInventoryListSelect,
} from "@/lib/prisma/vehicle-safe-select";

/**
 * Enriches vehicle media with public URLs.
 * Uses centralized getPublicUrl so legacy values are supported:
 * - Full URL (http/https): returned as-is.
 * - Legacy paths (/uploads/inventory/..., uploads/inventory/...): normalized to key then resolved.
 * - Bare key: resolved via active provider.
 */
export function enrichVehicleMedia<T>(vehicle: T | null): T | null {
  if (!vehicle || typeof vehicle !== "object" || !("media" in vehicle)) return vehicle;
  const v = vehicle as {
    media?: {
      url: string;
      thumbUrl?: string | null;
      cardUrl?: string | null;
      galleryUrl?: string | null;
    }[] | null;
  };
  if (!v.media?.length) return vehicle;
  return {
    ...vehicle,
    media: v.media.map((m) => ({
      ...m,
      url: getPublicUrl(String(m.url).trim()),
      thumbUrl: enrichMediaKey(m.thumbUrl),
      cardUrl: enrichMediaKey(m.cardUrl),
      galleryUrl: enrichMediaKey(m.galleryUrl),
    })),
  } as T;
}

/**
 * Fetches all vehicles for the admin inventory dashboard.
 * Includes associated media to display thumbnails.
 */
export async function getAdminInventory(organizationId: string): Promise<VehicleWithMedia[]> {
  const vehicles = await db.vehicle.findMany({
    where: { organizationId },
    select: vehicleWithMediaInventoryListSelect,
    orderBy: {
      createdAt: "desc",
    },
  });

  return vehicles.map((v) => enrichVehicleMedia(v)!) as VehicleWithMedia[];
}

/**
 * Fetches a single vehicle for admin editing.
 */
export async function getVehicleForEdit(organizationId: string, id: string) {
  const vehicle = await db.vehicle.findFirst({
    where: { id, organizationId },
    select: vehicleForEditSelect,
  });
  return enrichVehicleMedia(vehicle);
}

/**
 * Fetches a single vehicle with organization context, media, and metrics for admin view.
 */
export async function getAdminVehicleDetail(organizationId: string, id: string): Promise<VehicleWithMedia | null> {
  const vehicle = await db.vehicle.findFirst({
    where: { id, organizationId },
    select: buildVehicleInventorySelect(),
  });

  return enrichVehicleMedia(vehicle) as VehicleWithMedia | null;
}

/**
 * Fetches publicly available inventory with optional filters.
 * Filters for LISTED vehicles and includes their primary media.
 */
export async function getPublicInventory(
  organizationId: string,
  filters?: {
    make?: string;
    maxPrice?: number;
    minYear?: number;
    sort?: string;
    search?: string;
  }
): Promise<VehicleWithMedia[]> {
  const where: Prisma.VehicleWhereInput = {
    organizationId,
    vehicleStatus: "LISTED" as VehicleStatus,
  };

  if (filters?.make && filters.make !== "all") {
    where.make = filters.make;
  }

  if (filters?.maxPrice) {
    where.price = { lte: filters.maxPrice };
  }

  if (filters?.minYear) {
    where.year = { gte: filters.minYear };
  }

  if (filters?.search) {
    where.OR = [
      { make: { contains: filters.search, mode: "insensitive" } },
      { model: { contains: filters.search, mode: "insensitive" } },
      { vin: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.VehicleOrderByWithRelationInput[] = [];
  if (filters?.sort === "price-asc") {
    orderBy.push({ price: "asc" });
  } else if (filters?.sort === "price-desc") {
    orderBy.push({ price: "desc" });
  } else if (filters?.sort === "mileage-asc") {
    orderBy.push({ mileage: "asc" });
  } else {
    orderBy.push({ createdAt: "desc" });
  }

  const vehicles = await db.vehicle.findMany({
    where,
    select: vehicleWithMediaInventoryListSelect,
    orderBy,
  });

  return vehicles.map((v) => enrichVehicleMedia(v)!) as VehicleWithMedia[];
}

/**
 * Gets a unique list of all makes from listed inventory.
 */
export async function getPublicMakes(organizationId: string): Promise<string[]> {
  const result = await db.vehicle.findMany({
    where: {
      organizationId,
      vehicleStatus: "LISTED" as VehicleStatus,
    },
    select: { make: true },
    distinct: ["make"],
    orderBy: { make: "asc" },
  });
  return result.map((r) => r.make);
}

/**
 * Fetches the 3 most recently created LISTED vehicles for the homepage.
 */
export async function getFeaturedInventory(organizationId: string): Promise<VehicleWithMedia[]> {
  const vehicles = await db.vehicle.findMany({
    where: {
      organizationId,
      vehicleStatus: "LISTED" as VehicleStatus,
    },
    select: vehicleWithMediaInventoryListSelect,
    orderBy: {
      createdAt: "desc",
    },
    take: 3,
  });

  return vehicles.map((v) => enrichVehicleMedia(v)!) as VehicleWithMedia[];
}

/**
 * Fetches a single vehicle by ID for the public VDP.
 * Strictly filters for LISTED vehicles.
 */
export async function getPublicVehicleDetail(organizationId: string, id: string): Promise<VehicleWithMedia | null> {
  const vehicle = await db.vehicle.findFirst({
    where: {
      id,
      organizationId,
      vehicleStatus: "LISTED" as VehicleStatus,
    },
    select: buildVehicleInventorySelect(),
  });

  return enrichVehicleMedia(vehicle) as VehicleWithMedia | null;
}

/**
 * Fetches a single LISTED vehicle by slug (primary) or id (fallback), scoped to dealer.
 * Canon: slug is primary public identity; use for API v1 catalog detail.
 */
export async function getPublicVehicleDetailBySlugOrId(
  organizationId: string,
  slugOrId: string
): Promise<VehicleWithMedia | null> {
  const whereBase = {
    organizationId,
    vehicleStatus: "LISTED" as VehicleStatus,
  };
  const select = buildVehicleInventorySelect();

  const bySlug = await db.vehicle.findFirst({
    where: { ...whereBase, slug: slugOrId },
    select,
  });
  if (bySlug) return enrichVehicleMedia(bySlug) as VehicleWithMedia | null;

  const byVin = await db.vehicle.findFirst({
    where: { ...whereBase, vin: slugOrId },
    select,
  });
  if (byVin) return enrichVehicleMedia(byVin) as VehicleWithMedia | null;

  const byId = await db.vehicle.findFirst({
    where: { ...whereBase, id: slugOrId },
    select,
  });
  return enrichVehicleMedia(byId) as VehicleWithMedia | null;
}
