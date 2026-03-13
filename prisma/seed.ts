import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding initial organization and admin user...");

  // 1. Create Default Organization (Evo Motors)
  const evoMotors = await prisma.organization.upsert({
    where: { slug: "evo-motors" },
    update: {},
    create: {
      name: "Evo Motors",
      slug: "evo-motors",
    },
  });

  console.log(`✅ Organization created/updated: ${evoMotors.name} (${evoMotors.id})`);

  // 2. Create Admin User
  const tempAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || "theadmin123";
  const passwordHash = await bcrypt.hash(tempAdminPassword, 10);

  const adminEmail = "admin@evomotorsinc.com";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: "Evo",
      lastName: "Admin",
      role: Role.OWNER,
      passwordHash,
      isStub: false,
      twoFactorEnabled: false,
      organizationId: evoMotors.id,
    },
    create: {
      email: adminEmail,
      firstName: "Evo",
      lastName: "Admin",
      role: Role.OWNER,
      passwordHash,
      isStub: false,
      twoFactorEnabled: false,
      organizationId: evoMotors.id,
    },
  });

  console.log(`✅ Admin user created/updated successfully:`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Organization: ${evoMotors.name}`);
  console.log(`   Initial Password: ${tempAdminPassword}`);

  // 3. Backfill existing data if needed
  console.log("\nStarting data backfill...");

  const backfillModels = [
    { name: "Vehicle", model: prisma.vehicle },
    { name: "Deal", model: prisma.deal },
    { name: "VehicleInquiry", model: prisma.vehicleInquiry },
    { name: "VehicleRequest", model: prisma.vehicleRequest },
    { name: "ActivityEvent", model: prisma.activityEvent },
    { name: "TradeInCapture", model: prisma.tradeInCapture },
    { name: "EnergyServiceRequest", model: prisma.energyServiceRequest },
  ];

  for (const item of backfillModels) {
    const result = await (item.model as any).updateMany({
      where: { organizationId: null },
      data: { organizationId: evoMotors.id },
    });
    if (result.count > 0) {
      console.log(`   Backfilled ${result.count} ${item.name} records.`);
    }
  }

  console.log("\n✅ Seed and backfill complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
