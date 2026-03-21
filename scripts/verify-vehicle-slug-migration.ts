/**
 * Confirm Vehicle.slug column and unique index exist (PostgreSQL).
 * Run: npx tsx scripts/verify-vehicle-slug-migration.ts
 */

import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString });
// Prisma adapter unused; we only need raw pg for introspection
async function main() {
  const col = await pool.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Vehicle' AND column_name = 'slug'`
  );
  console.log("Column Vehicle.slug exists:", col.rows.length > 0);

  const idx = await pool.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = 'Vehicle'
       AND indexname = 'Vehicle_organizationId_slug_key'`
  );
  console.log("Index Vehicle_organizationId_slug_key exists:", idx.rows.length > 0);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
