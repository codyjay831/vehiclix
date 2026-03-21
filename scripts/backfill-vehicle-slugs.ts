/**
 * Backfill Vehicle.slug for existing vehicles.
 * Run after applying migration 20260317000000_add_vehicle_slug.
 *
 * Usage: npx tsx scripts/backfill-vehicle-slugs.ts
 *
 * Idempotent: only selects vehicles where slug IS NULL; never overwrites existing slugs.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { generateUniqueVehicleSlug } from "../src/lib/vehicle-slug";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const vehicles = await db.vehicle.findMany({
    where: { slug: null },
    select: { id: true, organizationId: true, year: true, make: true, model: true, trim: true },
    orderBy: [{ organizationId: "asc" }, { createdAt: "asc" }],
  });

  console.log(`Found ${vehicles.length} vehicles without slug.`);

  let updated = 0;
  for (const v of vehicles) {
    const slug = await generateUniqueVehicleSlug(db, v.organizationId, {
      id: v.id,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
    });
    await db.vehicle.update({
      where: { id: v.id },
      data: { slug },
    });
    updated++;
    if (updated % 50 === 0) console.log(`Updated ${updated}/${vehicles.length}...`);
  }

  console.log(`Done. Set slug on ${updated} vehicles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
