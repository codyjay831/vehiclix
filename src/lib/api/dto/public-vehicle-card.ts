/**
 * Public-safe vehicle card DTO for API v1 catalog list.
 * Canon: dealer-scoped, LISTED-only, full media URLs; slug is primary public identity.
 */

import type { VehicleWithMedia } from "@/types";
import { vehicleMediaCardUrl } from "@/lib/vehicle-media-display";

function stringifyPrice(value: unknown): string {
  if (value == null) return "0";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    return (value as { toString: () => string }).toString();
  }
  return String(value);
}

export interface PublicVehicleCardDto {
  id: string;
  /** Canon primary public identity (unique per dealer). */
  slug: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  price: string;
  mileage: number;
  /** batteryRangeEstimate in miles. */
  rangeMiles: number | null;
  condition: string;
  drivetrain: string;
  /** First media URL (hero image). Full URL only. */
  heroImage: string | null;
}

/**
 * Maps a vehicle with media (e.g. from getPublicInventory) to the public card DTO.
 * Expects media URLs already resolved (e.g. via enrichVehicleMedia in inventory lib).
 */
export function toPublicVehicleCardDto(vehicle: VehicleWithMedia): PublicVehicleCardDto {
  const firstMedia = vehicle.media?.[0];
  const heroUrl =
    firstMedia && typeof firstMedia.url === "string" ? vehicleMediaCardUrl(firstMedia) : null;

  return {
    id: vehicle.id,
    slug: vehicle.slug ?? null,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim ?? null,
    price: stringifyPrice(vehicle.price),
    mileage: vehicle.mileage,
    rangeMiles: vehicle.batteryRangeEstimate ?? null,
    condition: vehicle.condition,
    drivetrain: vehicle.drivetrain,
    heroImage: heroUrl,
  };
}
