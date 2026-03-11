import { db } from "./db";
import { VehicleWithMedia, VehicleStatus, Prisma } from "@/types";

/**
 * Fetches all vehicles for the admin inventory dashboard.
 * Includes associated media to display thumbnails.
 */
export async function getAdminInventory(): Promise<VehicleWithMedia[]> {
  return db.vehicle.findMany({
    include: {
      media: {
        orderBy: {
          displayOrder: "asc",
        },
        take: 1, // Only need the primary thumbnail for the table
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Fetches a single vehicle for admin editing.
 * Includes all fields but excludes media management for this pass.
 */
export async function getVehicleForEdit(id: string) {
  return db.vehicle.findUnique({
    where: { id },
  });
}

/**
 * Fetches publicly available inventory with optional filters.
 * Filters for LISTED vehicles and includes their primary media.
 */
export async function getPublicInventory(filters?: {
  make?: string;
  maxPrice?: number;
  minYear?: number;
  sort?: string;
  search?: string;
}): Promise<VehicleWithMedia[]> {
  const where: Prisma.VehicleWhereInput = {
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

  return db.vehicle.findMany({
    where,
    include: {
      media: {
        orderBy: {
          displayOrder: "asc",
        },
        take: 1,
      },
    },
    orderBy,
  });
}

/**
 * Gets a unique list of all makes from listed inventory.
 */
export async function getPublicMakes(): Promise<string[]> {
  const result = await db.vehicle.findMany({
    where: { vehicleStatus: "LISTED" as VehicleStatus },
    select: { make: true },
    distinct: ["make"],
    orderBy: { make: "asc" },
  });
  return result.map((r) => r.make);
}

/**
 * Fetches the 3 most recently created LISTED vehicles for the homepage.
 */
export async function getFeaturedInventory(): Promise<VehicleWithMedia[]> {
  return db.vehicle.findMany({
    where: {
      vehicleStatus: "LISTED" as VehicleStatus,
    },
    include: {
      media: {
        orderBy: {
          displayOrder: "asc",
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 3,
  });
}

/**
 * Fetches a single vehicle by ID for the public VDP.
 * Strictly filters for LISTED vehicles.
 */
export async function getPublicVehicleDetail(id: string): Promise<VehicleWithMedia | null> {
  return db.vehicle.findFirst({
    where: {
      id,
      vehicleStatus: "LISTED" as VehicleStatus,
    },
    include: {
      media: {
        orderBy: {
          displayOrder: "asc",
        },
      },
    },
  });
}
