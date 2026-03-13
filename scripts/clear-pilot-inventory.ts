import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clearPilotInventory() {
  const pilotOrgId = "faef5db9-fc06-4567-bfac-e99a7e697fb1";
  console.log(`Clearing inventory for Pilot Org: ${pilotOrgId}`);
  await prisma.vehicle.deleteMany({
    where: { organizationId: pilotOrgId }
  });
  console.log("✅ Pilot inventory cleared.");
}

clearPilotInventory()
  .then(() => prisma.$disconnect());
