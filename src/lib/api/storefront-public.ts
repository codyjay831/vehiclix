/**
 * Server-only helpers for storefront: read dealer + catalog + VDP via Website Integration API v1.
 * Same-origin fetch from Server Components; always pass dealerSlug for platform-host resolution.
 */

import { cache } from "react";
import { headers } from "next/headers";
import { MediaType } from "@prisma/client";
import type { PublicDealerDto } from "@/lib/api/dto/public-dealer";
import type { PublicVehicleCardDto } from "@/lib/api/dto/public-vehicle-card";
import type { PublicVehicleDetailDto } from "@/lib/api/dto/public-vehicle-detail";
import type { OrganizationBranding, OrganizationHomepage, VehicleMedia } from "@prisma/client";
import type { SerializedVehicle, SerializedVehicleWithMedia } from "@/types";
import { serializeDecimal } from "@/lib/serializers";

/**
 * Absolute origin for internal fetch from Server Components (Host + forwarded proto).
 */
export async function getStorefrontRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) {
    const fallback =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      process.env.APP_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";
    return fallback;
  }
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function fetchStorefrontPublicDealer(dealerSlug: string): Promise<PublicDealerDto | null> {
  const base = await getStorefrontRequestOrigin();
  const url = new URL("/api/v1/public/dealers", base);
  url.searchParams.set("dealerSlug", dealerSlug);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) return null;
  return (await res.json()) as PublicDealerDto;
}

/** Dedupe dealer fetch across generateMetadata + layout + page in one request. */
export const getCachedStorefrontPublicDealer = cache(fetchStorefrontPublicDealer);

export type StorefrontCatalogQuery = {
  make?: string;
  maxPrice?: string;
  minYear?: string;
  sort?: string;
  search?: string;
};

export async function fetchStorefrontPublicCatalog(
  dealerSlug: string,
  query: StorefrontCatalogQuery
): Promise<PublicVehicleCardDto[]> {
  const base = await getStorefrontRequestOrigin();
  const url = new URL("/api/v1/public/catalog", base);
  url.searchParams.set("dealerSlug", dealerSlug);
  if (query.make && query.make !== "all") url.searchParams.set("make", query.make);
  if (query.maxPrice != null && query.maxPrice !== "") url.searchParams.set("maxPrice", query.maxPrice);
  if (query.minYear != null && query.minYear !== "") url.searchParams.set("minYear", query.minYear);
  if (query.sort) url.searchParams.set("sort", query.sort);
  if (query.search) url.searchParams.set("search", query.search);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: PublicVehicleCardDto[] };
  return Array.isArray(data.items) ? data.items : [];
}

/** Unique makes for filter dropdown (same idea as getPublicMakes). */
export function deriveMakesFromCatalogItems(items: PublicVehicleCardDto[]): string[] {
  return [...new Set(items.map((v) => v.make).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/**
 * Maps public catalog card DTO → shape expected by InventoryCard / FeaturedInventory (until Phase 2).
 */
export function mapPublicVehicleCardForStorefrontGrid(card: PublicVehicleCardDto): SerializedVehicleWithMedia {
  const withMedia = {
    id: card.id,
    year: card.year,
    make: card.make,
    model: card.model,
    trim: card.trim,
    price: card.price,
    mileage: card.mileage,
    drivetrain: card.drivetrain,
    batteryRangeEstimate: card.rangeMiles,
    condition: card.condition,
    media: card.heroImage ? [{ url: card.heroImage }] : [],
  };
  return withMedia as unknown as SerializedVehicleWithMedia;
}

export function mapCatalogItemsForStorefrontGrid(items: PublicVehicleCardDto[]): SerializedVehicleWithMedia[] {
  return items.map(mapPublicVehicleCardForStorefrontGrid);
}

/** TenantProvider + getSafeHomepage expect Prisma-shaped branding/homepage; API DTO fields align. */
export function dealerDtoToTenantBrandingHomepage(dealer: PublicDealerDto): {
  branding: OrganizationBranding | null;
  homepage: OrganizationHomepage | null;
} {
  return {
    branding: (dealer.branding ?? null) as unknown as OrganizationBranding | null,
    homepage: (dealer.homepage ?? null) as unknown as OrganizationHomepage | null,
  };
}

export function serializeStorefrontVehicles(items: SerializedVehicleWithMedia[]) {
  return serializeDecimal(items);
}

// --- Phase 2: VDP / reserve read paths ---

export async function fetchStorefrontPublicVehicleDetail(
  dealerSlug: string,
  vehicleSlugOrId: string
): Promise<PublicVehicleDetailDto | null> {
  const base = await getStorefrontRequestOrigin();
  const segment = encodeURIComponent(vehicleSlugOrId);
  const url = new URL(`/api/v1/public/catalog/${segment}`, base);
  url.searchParams.set("dealerSlug", dealerSlug);
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) return null;
  return (await res.json()) as PublicVehicleDetailDto;
}

export const getCachedStorefrontPublicVehicleDetail = cache(fetchStorefrontPublicVehicleDetail);

/**
 * Map public VDP DTO → Prisma-like media + SerializedVehicle for existing VDP components.
 * VIN is not in the public API DTO; use a neutral placeholder for the specs row.
 */
export function mapPublicVehicleDetailDtoForStorefrontVdp(dto: PublicVehicleDetailDto): {
  media: VehicleMedia[];
  serializedVehicle: SerializedVehicle;
} {
  const media: VehicleMedia[] = dto.images.map((imageUrl, i) => ({
    id: `${dto.id}-img-${i}`,
    vehicleId: dto.id,
    mediaType: MediaType.IMAGE,
    url: imageUrl,
    thumbUrl: null,
    cardUrl: null,
    galleryUrl: null,
    displayOrder: i,
    createdAt: new Date(0),
  }));

  const serializedVehicle = {
    id: dto.id,
    slug: dto.slug,
    vin: "",
    year: dto.year,
    make: dto.make,
    model: dto.model,
    trim: dto.trim,
    bodyStyle: null,
    fuelType: null,
    transmission: null,
    doors: null,
    mileage: dto.mileage,
    drivetrain: dto.drivetrain,
    batteryRangeEstimate: dto.rangeMiles,
    batteryCapacityKWh: dto.batteryCapacityKWh,
    batteryChemistry: dto.batteryChemistry,
    chargingStandard: dto.chargingStandard,
    exteriorColor: dto.exteriorColor,
    interiorColor: dto.interiorColor,
    condition: dto.condition,
    titleStatus: dto.titleStatus,
    price: dto.price,
    description: dto.description,
    highlights: dto.highlights,
    features: dto.features,
    vehicleStatus: "LISTED",
  } as unknown as SerializedVehicle;

  return { media, serializedVehicle };
}

export function serializeStorefrontVdpVehicle(serialized: SerializedVehicle) {
  return serializeDecimal(serialized);
}
