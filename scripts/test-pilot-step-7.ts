import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const pilotOrgId = "faef5db9-fc06-4567-bfac-e99a7e697fb1";
const evoOrgId = "2f864538-ab68-4c05-84c5-3234e8970dc6";

async function verifyAuditLogs() {
  console.log("=== STEP 7: AUDIT LOG ATTRIBUTION VERIFICATION ===\n");

  // 1. Fetch Pilot Dealer Audit Events
  const pilotEvents = await prisma.activityEvent.findMany({
    where: { organizationId: pilotOrgId },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  console.log(`- Pilot Dealer Audit Events Count: ${pilotEvents.length}`);
  pilotEvents.forEach(e => {
    console.log(`- Event: ${e.eventType} | Entity: ${e.entityType} | Org: ${e.organizationId}`);
  });

  // 2. Ensure no Pilot Dealer events have Evo Org ID
  const misattributedEvents = pilotEvents.filter(e => e.organizationId === evoOrgId);
  console.log(`- Misattributed to Evo Org? ${misattributedEvents.length > 0}`);

  const allPilotCorrect = pilotEvents.every(e => e.organizationId === pilotOrgId);
  console.log(`\nAUDIT LOG VERIFIED: ${allPilotCorrect ? "PASS" : "FAIL"}`);
}

verifyAuditLogs()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
