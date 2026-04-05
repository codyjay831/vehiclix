import { Prisma } from "@prisma/client";
import { VehicleWithMedia } from "@/lib/prisma/vehicle-safe-select";
import type { PublicPricingMode } from "./api/dto/public-vehicle-card";

/**
 * Deeply serializes a vehicle object (or any object) for transfer from Server to Client.
 * Converts:
 * - Prisma.Decimal -> number (specifically for price, etc.)
 * - Date -> string (ISO 8601)
 * 
 * Handles nested objects and arrays.
 */
export function serializeVehicle<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj;

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeVehicle(item));
  }

  // Handle Prisma Decimal
  if (obj instanceof Prisma.Decimal) {
    return Number(obj);
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle objects
  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeVehicle(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Specialized type for the serialized version of a Vehicle payload.
 * Added pricingMode and allowed price to be null/string for truthful public DTOs.
 */
export type SerializedVehicle<T = VehicleWithMedia> = {
  [K in keyof T]: T[K] extends Prisma.Decimal
    ? number | string | null
    : T[K] extends Date
      ? string
      : T[K] extends (infer U)[]
        ? SerializedVehicle<U>[]
        : T[K] extends object | null | undefined
          ? T[K] extends object
            ? SerializedVehicle<T[K]>
            : T[K]
          : T[K];
} & { 
  pricingMode?: PublicPricingMode;
};

/**
 * Common payload types for admin vehicle components.
 */
export type SerializedVehicleWithMedia = SerializedVehicle<VehicleWithMedia>;
