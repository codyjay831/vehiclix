/**
 * One-off validation after slug backfill: null counts, duplicates, samples.
 * Run: npx tsx scripts/validate-vehicle-slugs.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const nullCount = await db.vehicle.count({ where: { slug: null } });
  console.log("NULL slug count:", nullCount);

  const dupes = await db.$queryRaw<
    { organizationId: string; slug: string; cnt: bigint }[]
  >`
    SELECT "organizationId", "slug", COUNT(*)::bigint AS cnt
    FROM "Vehicle"
    WHERE "slug" IS NOT NULL
    GROUP BY "organizationId", "slug"
    HAVING COUNT(*) > 1
  `;
  console.log("Duplicate (organizationId, slug) groups:", dupes.length);
  if (dupes.length) console.log(dupes);

  const samples = await db.vehicle.findMany({
    take: 5,
    orderBy: [{ organizationId: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      organizationId: true,
      slug: true,
      year: true,
      make: true,
      model: true,
      trim: true,
      vehicleStatus: true,
    },
  });
  console.log("Sample vehicles (first 5 by org, created):");
  console.log(JSON.stringify(samples, null, 2));
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
