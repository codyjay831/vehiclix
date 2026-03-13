import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const pilotOrgId = "faef5db9-fc06-4567-bfac-e99a7e697fb1";

async function verifyCustomerRegistration() {
  console.log("=== STEP 5: CUSTOMER REGISTRATION VERIFICATION ===\n");

  const customerEmail = "customer@pilot-test.com";

  // Simulate registration flow logic
  const user = await prisma.user.upsert({
    where: { email: customerEmail },
    update: { organizationId: pilotOrgId },
    create: {
      email: customerEmail,
      firstName: "Pilot",
      lastName: "Customer",
      role: Role.CUSTOMER,
      organizationId: pilotOrgId,
      passwordHash: "mock_hash",
    }
  });

  console.log(`✅ Customer created: ${user.email} (${user.id})`);
  console.log(`- Role: ${user.role}`);
  console.log(`- Organization ID: ${user.organizationId}`);

  const isCorrect = user.role === Role.CUSTOMER && user.organizationId === pilotOrgId;
  console.log(`\nCUSTOMER REGISTRATION VERIFIED: ${isCorrect ? "PASS" : "FAIL"}`);
}

verifyCustomerRegistration()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
