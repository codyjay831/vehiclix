import { Prisma } from "@prisma/client";

/**
 * Recursively converts Prisma Decimal and Date objects to plain strings/numbers.
 * This is required when passing data from Server Components to Client Components.
 * 
 * - Decimal -> string (preferred for currency/high precision)
 * - Date -> string (ISO format)
 */
export function serializeDecimal<T>(data: T): any {
  if (data === null || data === undefined) return data;

  // Handle Prisma Decimal
  if ((data as any) instanceof Prisma.Decimal) {
    return (data as any).toString();
  }

  // Handle Date
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    return data.map(item => serializeDecimal(item));
  }

  // Handle Objects
  if (typeof data === "object") {
    const serialized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        serialized[key] = serializeDecimal((data as any)[key]);
      }
    }
    return serialized;
  }

  return data;
}
