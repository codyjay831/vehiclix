/**
 * Public-safe vehicle detail (VDP) DTO for API v1 catalog.
 * Canon: dealer-scoped, LISTED-only, full media URLs; slug is primary public identity.
 */

import type { VehicleWithMedia } from "@/types";
import { vehicleMediaGalleryUrl } from "@/lib/vehicle-media-display";
import type { PublicPricingMode } from "./public-vehicle-card";

function stringifyPrice(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    const s = (value as { toString: () => string }).toString();
    return s === "0" ? null : s;
  }
  const s = String(value);
  return s === "0" ? null : s;
}

export interface PublicVehicleDetailDealerSummary {
  name: string;
  slug: string;
}

export interface PublicVehicleDetailDto {
  id: string;
  /** Canon primary public identity (unique per dealer). */
  slug: string | null;
  /** Permanent public VIN identifier. */
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  /** numeric string price or null if no price is to be shown. */
  price: string | null;
  /** Source of truth for pricing presentation. */
  pricingMode: PublicPricingMode;
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
    .map((m) => {
      if (!m || typeof m.url !== "string") return "";
      return vehicleMediaGalleryUrl(m);
    })
    .filter(Boolean);
  const firstUrl = mediaUrls[0] ?? null;

  const org = vehicle.organization as { name?: string; slug?: string } | null;

  // Bridge logic: if price is null, 0, or placeholder (1000), default to PRICE_ON_REQUEST
  const pStr = stringifyPrice(vehicle.price);
  const pNum = Number(pStr);
  const isPlaceholder = pNum === 1000;
  const hasPrice = pStr != null && pNum > 0 && !isPlaceholder;

  return {
    id: vehicle.id,
    slug: vehicle.slug ?? null,
    vin: vehicle.vin,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim ?? null,
    price: hasPrice ? pStr : null,
    pricingMode: hasPrice ? "LIST_PRICE" : "HIDE_PRICE",
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
