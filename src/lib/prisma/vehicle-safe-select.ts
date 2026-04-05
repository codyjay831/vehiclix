import { Prisma } from "@prisma/client";

/**
 * Production-safe Vehicle scalar selection.
 * Omits columns that may not exist on older databases (e.g. before migrations that add
 * `conditionNotes`, `intakeFieldProvenance`), avoiding Prisma P2022 on full-row loads.
 */
export const vehicleSafeScalarSelect = {
  id: true,
  vin: true,
  year: true,
  make: true,
  model: true,
  trim: true,
  bodyStyle: true,
  fuelType: true,
  transmission: true,
  doors: true,
  mileage: true,
  drivetrain: true,
  batteryRangeEstimate: true,
  batteryCapacityKWh: true,
  batteryChemistry: true,
  chargingStandard: true,
  exteriorColor: true,
  interiorColor: true,
  titleStatus: true,
  price: true,
  description: true,
  highlights: true,
  features: true,
  internalNotes: true,
  conditionNotes: true,
  intakeFieldProvenance: true,
  vehicleStatus: true,
  createdAt: true,
  updatedAt: true,
  condition: true,
  organizationId: true,
  slug: true,
  shares: true,
  views: true,
} satisfies Prisma.VehicleSelect;

export type VehicleSafeScalar = Prisma.VehicleGetPayload<{ select: typeof vehicleSafeScalarSelect }>;

export const vehicleMediaSelect = {
  id: true,
  vehicleId: true,
  mediaType: true,
  url: true,
  thumbUrl: true,
  cardUrl: true,
  galleryUrl: true,
  displayOrder: true,
  createdAt: true,
} satisfies Prisma.VehicleMediaSelect;

export const vehicleOrganizationSummarySelect = {
  id: true,
  name: true,
  slug: true,
  phone: true,
} satisfies Prisma.OrganizationSelect;

/** Narrow vehicle on nested admin / portal reads (replaces unsafe `vehicle: true`). */
export const vehicleNestedAdminContextSelect = {
  id: true,
  vin: true,
  year: true,
  make: true,
  model: true,
  trim: true,
  price: true,
  vehicleStatus: true,
} satisfies Prisma.VehicleSelect;

const vehicleDocumentSelect = {
  id: true,
  vehicleId: true,
  documentLabel: true,
  fileUrl: true,
  uploadedAt: true,
} satisfies Prisma.VehicleDocumentSelect;

/**
 * Inventory / catalog: safe scalars + media + org summary + inquiry count.
 * @param mediaTake pass `1` for list thumbnails; omit for full gallery.
 */
export function buildVehicleInventorySelect(mediaTake?: number) {
  return {
    ...vehicleSafeScalarSelect,
    media: {
      orderBy: { displayOrder: "asc" as const },
      ...(mediaTake != null ? { take: mediaTake } : {}),
      select: vehicleMediaSelect,
    },
    organization: { select: vehicleOrganizationSummarySelect },
    listingDrafts: {
      select: {
        id: true,
        channel: true,
        title: true,
        body: true,
        tone: true,
        length: true,
        updatedAt: true,
      },
    },
    _count: { select: { inquiries: true, deals: true, leads: true, tradeInCaptures: true } },
  } satisfies Prisma.VehicleSelect;
}

/** Canonical type for inventory/detail payloads (full media list). */
export const vehicleWithMediaInventoryDetailSelect = buildVehicleInventorySelect();

export type VehicleWithMedia = Prisma.VehicleGetPayload<{
  select: typeof vehicleWithMediaInventoryDetailSelect;
}>;

export const vehicleWithMediaInventoryListSelect = buildVehicleInventorySelect(1);

/** Vehicle edit preload: safe scalars + ordered media for the admin form. */
export const vehicleForEditSelect = {
  ...vehicleSafeScalarSelect,
  media: {
    orderBy: { displayOrder: "asc" as const },
    select: vehicleMediaSelect,
  },
} satisfies Prisma.VehicleSelect;

/** Portal active deal: safe scalars + primary image. */
export const portalActiveDealVehicleSelect = {
  ...vehicleSafeScalarSelect,
  media: {
    orderBy: { displayOrder: "asc" as const },
    take: 1,
    select: vehicleMediaSelect,
  },
} satisfies Prisma.VehicleSelect;

export type PortalActiveDealVehicle = Prisma.VehicleGetPayload<{
  select: typeof portalActiveDealVehicleSelect;
}>;

/** Unused today; kept compile-safe if detail-with-documents is wired later. */
export const vehicleDetailPayloadSelect = {
  ...vehicleSafeScalarSelect,
  media: {
    orderBy: { displayOrder: "asc" as const },
    select: vehicleMediaSelect,
  },
  documents: {
    orderBy: { uploadedAt: "asc" as const },
    select: vehicleDocumentSelect,
  },
} satisfies Prisma.VehicleSelect;

export type VehicleDetailPayload = Prisma.VehicleGetPayload<{
  select: typeof vehicleDetailPayloadSelect;
}>;
