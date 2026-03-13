import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";
import { getAdminInventory } from "../src/lib/inventory";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const pilotOrgId = "faef5db9-fc06-4567-bfac-e99a7e697fb1";
const evoOrgId = "2f864538-ab68-4c05-84c5-3234e8970dc6";

async function verifyIsolation() {
  console.log("=== STEP 2: ADMIN DASHBOARD ISOLATION VERIFICATION ===\n");

  // 1. Check Pilot Dealer Inventory
  const pilotInventory = await getAdminInventory(pilotOrgId);
  console.log(`- Pilot Dealer Admin Inventory Count: ${pilotInventory.length}`);
  const hasEvoVehicles = pilotInventory.some(v => v.organizationId === evoOrgId);
  console.log(`- Contains Evo Motors vehicles? ${hasEvoVehicles}`);

  // 2. Check Deals for Pilot Org
  const pilotDeals = await prisma.deal.findMany({ where: { organizationId: pilotOrgId } });
  console.log(`- Pilot Dealer Admin Deals Count: ${pilotDeals.length}`);

  // 3. Check Requests for Pilot Org
  const pilotRequests = await prisma.vehicleRequest.findMany({ where: { organizationId: pilotOrgId } });
  console.log(`- Pilot Dealer Admin Requests Count: ${pilotRequests.length}`);

  const isIsolated = pilotInventory.length === 0 && !hasEvoVehicles && pilotDeals.length === 0 && pilotRequests.length === 0;
  console.log(`\nISOLATION VERIFIED: ${isIsolated ? "PASS" : "FAIL"}`);
}

verifyIsolation()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
