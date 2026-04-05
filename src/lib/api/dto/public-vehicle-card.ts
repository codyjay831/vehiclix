/**
 * Public-safe vehicle card DTO for API v1 catalog list.
 * Canon: dealer-scoped, LISTED-only, full media URLs; slug is primary public identity.
 */

import type { VehicleWithMedia } from "@/types";
import { vehicleMediaCardUrl } from "@/lib/vehicle-media-display";

/**
 * Public pricing mode for Website Integration API v1.
 * Determines how the website should render price and CTA.
 */
export type PublicPricingMode = "LIST_PRICE" | "PRICE_ON_REQUEST" | "CALL_FOR_PRICE" | "HIDE_PRICE";

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

export interface PublicVehicleCardDto {
  id: string;
  /** Canon primary public identity (unique per dealer). */
  slug: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  /** numeric string price or null if no price is to be shown. */
  price: string | null;
  /** Source of truth for pricing presentation. */
  pricingMode: PublicPricingMode;
  mileage: number;
  /** batteryRange Estimate in miles. */
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

  // Bridge logic: if price is null, 0, or placeholder, default to PRICE_ON_REQUEST
  const rawPrice = vehicle.price;
  const pStr = stringifyPrice(rawPrice);
  const pNum = Number(pStr);
  const isPlaceholder = pNum === 1000; // INTAKE_PLACEHOLDER_PRICE
  const hasPrice = pStr != null && pNum > 0 && !isPlaceholder;

  return {
    id: vehicle.id,
    slug: vehicle.slug ?? null,
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
    heroImage: heroUrl,
  };
}
