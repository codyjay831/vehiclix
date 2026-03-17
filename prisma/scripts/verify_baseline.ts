/**
 * Read-only script to verify baseline schema exists in the database.
 * Run: npx tsx prisma/scripts/verify_baseline.ts
 * Requires: DATABASE_URL in .env
 */
import "dotenv/config";
import { Pool } from "pg";

const BASELINE_TABLES = [
  "ActivityEvent",
  "BetaAccessRequest",
  "Deal",
  "DealDeposit",
  "DealDocument",
  "DocuSignEnvelope",
  "EnergyServiceRequest",
  "EnergyServiceStatusHistory",
  "Lead",
  "LeadActivity",
  "Organization",
  "OrganizationBranding",
  "OrganizationDomain",
  "OrganizationHomepage",
  "OrganizationSubscription",
  "OwnerInvite",
  "TradeInCapture",
  "User",
  "Vehicle",
  "VehicleDocument",
  "VehicleInquiry",
  "VehicleMedia",
  "VehicleProposal",
  "VehicleRequest",
];

const BASELINE_ENUMS = [
  "ContactMethod",
  "DealStatus",
  "DocumentStatus",
  "DomainStatus",
  "Drivetrain",
  "EnergyServiceStatus",
  "EnergyServiceType",
  "EnvelopeStatus",
  "InquiryStatus",
  "InventoryCondition",
  "LeadActivityType",
  "LeadSource",
  "LeadStatus",
  "MediaType",
  "PaymentStatus",
  "Priority",
  "ProposalStatus",
  "Role",
  "SubscriptionStatus",
  "TitleStatus",
  "TradeInCondition",
  "VehicleRequestStatus",
  "VehicleStatus",
  "BetaAccessStatus",
  "InviteStatus",
  "PlanKey",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  try {
    const tablesResult = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    const dbTables = new Set((tablesResult.rows as { tablename: string }[]).map((r) => r.tablename));

    const enumsResult = await pool.query(`
      SELECT t.typname
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `);
    const dbEnums = new Set((enumsResult.rows as { typname: string }[]).map((r) => r.typname));

    const missingTables = BASELINE_TABLES.filter((t) => !dbTables.has(t));
    const missingEnums = BASELINE_ENUMS.filter((e) => !dbEnums.has(e));

    console.log("=== BASELINE TABLES (expected) ===");
    console.log(BASELINE_TABLES.join(", "));
    console.log("\n=== BASELINE ENUMS (expected) ===");
    console.log(BASELINE_ENUMS.join(", "));
    console.log("\n=== DB TABLES (found) ===");
    console.log(Array.from(dbTables).sort().join(", "));
    console.log("\n=== DB ENUMS (found) ===");
    console.log(Array.from(dbEnums).sort().join(", "));
    console.log("\n=== MISSING TABLES ===");
    console.log(missingTables.length ? missingTables.join(", ") : "None");
    console.log("\n=== MISSING ENUMS ===");
    console.log(missingEnums.length ? missingEnums.join(", ") : "None");

    const vehicleColsResult = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Vehicle'
      ORDER BY ordinal_position
    `);
    const vehicleColumns = new Set((vehicleColsResult.rows as { column_name: string }[]).map((r) => r.column_name));
    const phase2Columns = ["bodyStyle", "fuelType", "transmission", "doors"];
    const hasPhase2 = phase2Columns.every((c) => vehicleColumns.has(c));
    const evColumns = ["batteryCapacityKWh", "batteryChemistry", "chargingStandard"];
    const hasEv = evColumns.every((c) => vehicleColumns.has(c));

    console.log("\n=== Vehicle table: Phase 2 columns (bodyStyle, fuelType, transmission, doors) ===");
    console.log(hasPhase2 ? "Present (already applied)" : "Missing (will be added by deploy)");
    console.log("\n=== Vehicle table: EV spec columns (batteryCapacityKWh, batteryChemistry, chargingStandard) ===");
    console.log(hasEv ? "Present (already applied)" : "Missing (will be added by deploy)");

    if (missingTables.length > 0 || missingEnums.length > 0) {
      console.log("\nVERDICT: NOT SAFE — baseline schema is incomplete.");
      process.exit(2);
    }

    console.log("\nVERDICT: SAFE — all baseline tables and enums exist.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
