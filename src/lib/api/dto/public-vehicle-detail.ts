/**
 * Public-safe vehicle detail (VDP) DTO for API v1 catalog.
 * Canon: dealer-scoped, LISTED-only, full media URLs; slug is primary public identity.
 */

import type { VehicleWithMedia } from "@/types";

function stringifyPrice(value: unknown): string {
  if (value == null) return "0";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    return (value as { toString: () => string }).toString();
  }
  return String(value);
}

export interface PublicVehicleDetailDealerSummary {
  name: string;
  slug: string;
}

export interface PublicVehicleDetailDto {
  id: string;
  /** Canon primary public identity (unique per dealer). */
  slug: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  price: string;
  mileage: number;
  rangeMiles: number | null;
  condition: string;
  drivetrain: string;
  titleStatus: string;
  /** For public catalog this is always LISTED; exposed for metadata/SEO. */
  status: "LISTED";
  exteriorColor: string;
  interiorColor: string;
  description: string | null;
  highlights: string[];
  features: string[];
  /** First media URL (hero). Full URL only. */
  heroImage: string | null;
  /** All media URLs in display order. Full URLs only. */
  images: string[];
  /** Battery capacity in kWh if available. */
  batteryCapacityKWh: number | null;
  batteryChemistry: string | null;
  chargingStandard: string | null;
  dealer: PublicVehicleDetailDealerSummary | null;
}

/**
 * Maps a vehicle with media (e.g. from getPublicVehicleDetail) to the public VDP DTO.
 * Expects media URLs already resolved. Excludes internalNotes and raw workflow fields.
 */
export function toPublicVehicleDetailDto(vehicle: VehicleWithMedia): PublicVehicleDetailDto {
  const mediaUrls = (vehicle.media ?? [])
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((m) => (m?.url && typeof m.url === "string" ? m.url : ""))
    .filter(Boolean);
  const firstUrl = mediaUrls[0] ?? null;

  const org = vehicle.organization as { name?: string; slug?: string } | null;

  return {
    id: vehicle.id,
    slug: (vehicle as { slug?: string | null }).slug ?? null,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim ?? null,
    price: stringifyPrice(vehicle.price),
    mileage: vehicle.mileage,
    rangeMiles: vehicle.batteryRangeEstimate ?? null,
    condition: vehicle.condition,
    drivetrain: vehicle.drivetrain,
    titleStatus: vehicle.titleStatus,
    status: "LISTED",
    exteriorColor: vehicle.exteriorColor,
    interiorColor: vehicle.interiorColor,
    description: vehicle.description ?? null,
    highlights: Array.isArray(vehicle.highlights) ? vehicle.highlights : [],
    features: Array.isArray(vehicle.features) ? vehicle.features : [],
    heroImage: firstUrl,
    images: mediaUrls,
    batteryCapacityKWh: vehicle.batteryCapacityKWh ?? null,
    batteryChemistry: vehicle.batteryChemistry ?? null,
    chargingStandard: vehicle.chargingStandard ?? null,
    dealer: org?.name != null && org?.slug != null ? { name: org.name, slug: org.slug } : null,
  };
}
