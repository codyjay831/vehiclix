/**
 * Production-safe read-only verification for approval-flow schema.
 * Run against production (or any DB): npx tsx prisma/scripts/verify_production_schema.ts
 * Requires: DATABASE_URL in environment (e.g. .env or export).
 *
 * Outputs:
 * - A. Migration state (applied migrations, missing vs local, whether DB is behind)
 * - B. Organization table: presence of "status" column and OrganizationStatus enum
 */

import "dotenv/config";
import { Pool } from "pg";

const REQUIRED_MIGRATIONS_FOR_APPROVAL = [
  "20260315000000_init_baseline",
  "20260316000000_add_organization_status",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  try {
    console.log("=== A. MIGRATION STATE ===\n");

    const migrationsResult = await pool.query(`
      SELECT migration_name, finished_at, rolled_back_at, started_at
      FROM "_prisma_migrations"
      ORDER BY finished_at ASC NULLS LAST, started_at ASC
    `);
    const rows = migrationsResult.rows as {
      migration_name: string;
      finished_at: string | null;
      rolled_back_at: string | null;
      started_at: string | null;
    }[];

    const applied = rows.filter((r) => r.finished_at != null && r.rolled_back_at == null).map((r) => r.migration_name);
    const failed = rows.filter((r) => r.finished_at == null || r.rolled_back_at != null).map((r) => r.migration_name);

    console.log("Applied migrations (finished, not rolled back):");
    console.log(applied.length ? applied.join("\n") : "(none)");
    console.log("\nFailed or in-progress migrations:");
    console.log(failed.length ? failed.join("\n") : "(none)");

    const missingForApproval = REQUIRED_MIGRATIONS_FOR_APPROVAL.filter((m) => !applied.includes(m));
    const productionBehind = missingForApproval.length > 0 || failed.length > 0;

    console.log("\nRequired for approval flow: " + REQUIRED_MIGRATIONS_FOR_APPROVAL.join(", "));
    console.log("Missing (not applied): " + (missingForApproval.length ? missingForApproval.join(", ") : "none"));
    console.log("Production DB behind schema (missing or failed migrations): " + (productionBehind ? "YES" : "NO"));

    console.log("\n=== B. PRODUCTION SCHEMA CHECK (Organization) ===\n");

    const orgColumnsResult = await pool.query(
      `SELECT column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'Organization'
       ORDER BY ordinal_position`
    );
    const orgColumns = (orgColumnsResult.rows as { column_name: string; data_type: string; udt_name: string }[]).map(
      (r) => r.column_name
    );
    const hasStatusColumn = orgColumns.includes("status");

    const enumResult = await pool.query(
      `SELECT t.typname FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public' AND t.typname = 'OrganizationStatus'`
    );
    const hasOrganizationStatusEnum = (enumResult.rows as { typname: string }[]).length > 0;

    console.log("Organization table columns:", orgColumns.join(", "));
    console.log("Organization.status column exists:", hasStatusColumn ? "YES" : "NO");
    console.log("OrganizationStatus enum/type exists:", hasOrganizationStatusEnum ? "YES" : "NO");

    if (!hasStatusColumn || !hasOrganizationStatusEnum) {
      console.log("\nVERDICT: Organization schema is MISSING required status — approval flow will fail at org create.");
      process.exit(2);
    }
    if (productionBehind) {
      console.log("\nVERDICT: Migration table has failed/in-progress rows; schema is OK. Resolve if deploy is blocked.");
    } else {
      console.log("\nVERDICT: Schema and migration state OK for approval flow.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
