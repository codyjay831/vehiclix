/**
 * Verify getPublicVehicleDetailBySlugOrId: slug, id fallback, LISTED-only.
 * Run from repo root: npx tsx scripts/verify-catalog-lookup.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getPublicVehicleDetailBySlugOrId } from "../src/lib/inventory";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const listed = await db.vehicle.findFirst({
    where: { vehicleStatus: "LISTED", slug: { not: null } },
    select: { id: true, organizationId: true, slug: true },
  });

  if (!listed?.slug) {
    console.log("No LISTED vehicle with slug — skip lookup tests.");
    return;
  }

  const bySlug = await getPublicVehicleDetailBySlugOrId(listed.organizationId, listed.slug);
  const byId = await getPublicVehicleDetailBySlugOrId(listed.organizationId, listed.id);
  console.log("LISTED by slug:", bySlug ? { id: bySlug.id, slug: bySlug.slug } : null);
  console.log("LISTED by id:", byId ? { id: byId.id, slug: byId.slug } : null);
  console.log("Same vehicle:", bySlug?.id === byId?.id);

  const draft = await db.vehicle.findFirst({
    where: { vehicleStatus: { not: "LISTED" } },
    select: { id: true, organizationId: true, slug: true },
  });
  if (draft) {
    const ref = draft.slug ?? draft.id;
    const hidden = await getPublicVehicleDetailBySlugOrId(draft.organizationId, ref);
    console.log("Non-LISTED lookup (expect null):", hidden);
  } else {
    console.log("No non-LISTED vehicle in DB — LISTED-only check skipped.");
  }
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
