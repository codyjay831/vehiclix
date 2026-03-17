import { db } from "./db";
import { VehicleWithMedia, VehicleStatus, Prisma } from "@/types";
import { getStorageProvider } from "@/lib/storage";

/**
 * Enriches vehicle media with public URLs.
 */
function enrichVehicleMedia(vehicle: any) {
  if (!vehicle || !vehicle.media) return vehicle;
  
  const storage = getStorageProvider();
  vehicle.media = vehicle.media.map((m: any) => ({
    ...m,
    url: storage.getPublicUrl(m.url),
  }));
  
  return vehicle;
}

/**
 * Fetches all vehicles for the admin inventory dashboard.
 * Includes associated media to display thumbnails.
 */
export async function getAdminInventory(organizationId: string): Promise<VehicleWithMedia[]> {
  const vehicles = await db.vehicle.findMany({
    where: { organizationId },
    include: {
      media: {
        orderBy: {
          displayOrder: "asc",
        },
        take: 1, // Only need the primary thumbnail for the table
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
        },
      },
      _count: {
        select: {
          inquiries: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return vehicles.map(enrichVehicleMedia);
}

/**
 * Fetches a single vehicle for admin editing.
 */
export async function getVehicleForEdit(organizationId: string, id: string) {
  return db.vehicle.findFirst({
    where: { id, organizationId },
  });
}

/**
 * Fetches a single vehicle with organization context, media, and metrics for admin view.
 */
export async function getAdminVehicleDetail(organizationId: string, id: string): Promise<VehicleWithMedia | null> {
  const vehicle = await db.vehicle.findFirst({
    where: { id, organizationId },
    include: {
      media: {
        orderBy: {
          displayOrder: "asc",
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
        },
      },
      _count: {
        select: {
          inquiries: true,
        },
      },
    },
  });

  return enrichVehicleMedia(vehicle);
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
    include: {
      media: {
        orderBy: {
          displayOrder: "asc",
        },
        take: 1,
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
        },
      },
      _count: {
        select: {
          inquiries: true,
        },
      },
    },
    orderBy,
  });

  return vehicles.map(enrichVehicleMedia);
}

/**
 * Gets a unique list of all makes from listed inventory.
 */
export async function getPublicMakes(organizationId: string): Promise<string[]> {
  const result = await db.vehicle.findMany({
    where: { 
      organizationId,
      vehicleStatus: "LISTED" as VehicleStatus 
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
    include: {
      media: {
        orderBy: {
          displayOrder: "asc",
        },
        take: 1,
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
        },
      },
      _count: {
        select: {
          inquiries: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 3,
  });

  return vehicles.map(enrichVehicleMedia);
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
    include: {
      media: {
        orderBy: {
          displayOrder: "asc",
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
        },
      },
      _count: {
        select: {
          inquiries: true,
        },
      },
    },
  });

  return enrichVehicleMedia(vehicle);
}
