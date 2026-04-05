import { Prisma } from "@prisma/client";
import { vehicleNestedAdminContextSelect } from "@/lib/prisma/vehicle-safe-select";
import type { VehicleWithMedia } from "@/lib/prisma/vehicle-safe-select";

// 1. Re-export all raw enums and models from @prisma/client
export * from "@prisma/client";
export { Prisma };

// 2. Composed types using Prisma payload-derived types
// These are standardized shapes for common app needs (e.g. including relations)

export type {
  VehicleWithMedia,
  VehicleSafeScalar,
  VehicleDetailPayload,
} from "@/lib/prisma/vehicle-safe-select";

/**
 * Deal with the associated vehicle and customer (user) info
 */
export type DealWithContext = Prisma.DealGetPayload<{
  include: {
    vehicle: { select: typeof vehicleNestedAdminContextSelect };
    user: true;
    deposits: {
      orderBy: { paymentTimestamp: "desc" };
      take: 1;
    };
  };
}>;

/**
 * Deal with everything - for admin detail view
 */
export type DealFullPayload = Prisma.DealGetPayload<{
  include: {
    vehicle: { select: typeof vehicleNestedAdminContextSelect };
    user: true;
    deposits: {
      orderBy: { paymentTimestamp: "desc" };
    };
    documents: {
      orderBy: { createdAt: "asc" };
    };
    envelopes: {
      orderBy: { sentAt: "desc" };
    };
  };
}>;

/**
 * Vehicle request with all dealer proposals
 */
export type VehicleRequestWithProposals = Prisma.VehicleRequestGetPayload<{
  include: { proposals: true };
}>;

/**
 * Inquiry with its context vehicle
 */
export type InquiryWithVehicle = Prisma.VehicleInquiryGetPayload<{
  include: {
    vehicle: { select: typeof vehicleNestedAdminContextSelect };
  };
}>;

/**
 * Energy service request with history
 */
export type EnergyRequestWithHistory = Prisma.EnergyServiceRequestGetPayload<{
  include: { statusHistory: true };
}>;

/**
 * Serialized vehicle types (Decimal -> number, Date -> string)
 */
export type { SerializedVehicle, SerializedVehicleWithMedia } from "@/lib/vehicle-serialization";
export type { PublicPricingMode } from "@/lib/api/dto/public-vehicle-card";

// 3. Re-export all label maps and enum helpers
export * from "./enums";
