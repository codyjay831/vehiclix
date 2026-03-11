import { Prisma } from "@prisma/client";

// 1. Re-export all raw enums and models from @prisma/client
export * from "@prisma/client";
export { Prisma };

// 2. Composed types using Prisma payload-derived types
// These are standardized shapes for common app needs (e.g. including relations)

/**
 * Vehicle with its gallery media
 */
export type VehicleWithMedia = Prisma.VehicleGetPayload<{
  include: { media: true };
}>;

/**
 * Full vehicle detail including media and private documents
 */
export type VehicleDetailPayload = Prisma.VehicleGetPayload<{
  include: { media: true; documents: true };
}>;

/**
 * Deal with the associated vehicle and customer (user) info
 */
export type DealWithContext = Prisma.DealGetPayload<{
  include: { vehicle: true; user: true };
}>;

/**
 * Deal with everything - for admin detail view
 */
export type DealFullPayload = Prisma.DealGetPayload<{
  include: {
    vehicle: true;
    user: true;
    deposits: true;
    documents: true;
    envelopes: true;
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
  include: { vehicle: true };
}>;

/**
 * Energy service request with history
 */
export type EnergyRequestWithHistory = Prisma.EnergyServiceRequestGetPayload<{
  include: { statusHistory: true };
}>;

// 3. Re-export all label maps and enum helpers
export * from "./enums";
