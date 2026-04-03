/**
 * Vehicle slug generation for canon-aligned public identity.
 * Uniqueness is per organization (dealer-scoped).
 * Used by backfill and by vehicle create.
 */

/**
 * Minimal db-like interface for slug generation (works with db or transaction client).
 */
interface VehicleSlugDb {
  vehicle: {
    findFirst: (args: {
      where: { organizationId: string; slug: string; id?: { not: string } };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
    findMany: (args: {
      where: { organizationId: string; slug: { startsWith: string }; id?: { not: string } };
      select: { slug: true };
    }) => Promise<{ slug: string | null }[]>;
  };
}

/**
 * Normalizes a string for use in a vehicle slug: lowercase, hyphens, alphanumeric only.
 */
export function normalizeVehicleSlugPart(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds a base slug from vehicle fields (no collision suffix).
 * Format: year-make-model[-trim]. Empty/undefined parts omitted.
 */
export function vehicleSlugBase(vehicle: {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
}): string {
  const parts = [
    String(vehicle.year),
    normalizeVehicleSlugPart(vehicle.make),
    normalizeVehicleSlugPart(vehicle.model),
  ];
  if (vehicle.trim && vehicle.trim.trim()) {
    parts.push(normalizeVehicleSlugPart(vehicle.trim));
  }
  const base = parts.filter(Boolean).join("-").replace(/-+/g, "-");
  return base || "vehicle";
}

/**
 * Returns a slug that is unique within the organization.
 * Tries base first; on collision appends -2, -3, ... until unique.
 */
export async function generateUniqueVehicleSlug(
  db: VehicleSlugDb,
  organizationId: string,
  vehicle: { id: string; year: number; make: string; model: string; trim?: string | null }
): Promise<string> {
  const base = vehicleSlugBase(vehicle);

  // Find all existing slugs starting with our base in one query.
  // This avoids multiple round-trips to the database inside a transaction.
  const existing = await db.vehicle.findMany({
    where: {
      organizationId,
      slug: {
        startsWith: base,
      },
      id: { not: vehicle.id },
    },
    select: { slug: true },
  });

  if (existing.length === 0) return base;

  const slugs = new Set(existing.map((e) => e.slug).filter(Boolean) as string[]);
  if (!slugs.has(base)) return base;

  let n = 2;
  while (true) {
    const candidate = `${base}-${n}`;
    if (!slugs.has(candidate)) return candidate;
    n++;
    // Safety break to prevent infinite loop (though highly unlikely with unique set)
    if (n > 1000) return `${base}-${n}-${Math.floor(Math.random() * 10000)}`;
  }
}
