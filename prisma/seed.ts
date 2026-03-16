import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { normalizeSlug } from "../src/lib/organization";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function seedBootstrap() {
  console.log("--- Starting Platform Bootstrap Seed ---");
  
  const superAdminEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL || "admin@vehiclix.app";
  const superAdminPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD || "superadmin123";
  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      firstName: "Platform",
      lastName: "Admin",
      role: Role.SUPER_ADMIN,
      passwordHash,
      isStub: false,
      twoFactorEnabled: false,
      organizationId: null,
    },
    create: {
      email: superAdminEmail,
      firstName: "Platform",
      lastName: "Admin",
      role: Role.SUPER_ADMIN,
      passwordHash,
      isStub: false,
      twoFactorEnabled: false,
      organizationId: null,
    },
  });

  console.log(`✅ SUPER_ADMIN created/updated: ${superAdmin.email}`);
  console.log(`   Temporary Password: ${superAdminPassword}`);
  console.log("--- Bootstrap Complete ---");
  return superAdmin;
}

async function seedDemo() {
  console.log("--- Starting Demo Tenant Seed (Evo Motors) ---");
  
  // 1. Create Default Organization (Evo Motors)
  const defaultSlug = normalizeSlug("Evo Motors");
  const evoMotors = await prisma.organization.upsert({
    where: { slug: defaultSlug },
    update: {},
    create: {
      name: "Evo Motors",
      slug: defaultSlug,
    },
  });

  // 2. Ensure Branding exists
  await prisma.organizationBranding.upsert({
    where: { organizationId: evoMotors.id },
    update: {},
    create: {
      organizationId: evoMotors.id,
      heroHeadline: "Experience Electric Excellence.",
      heroSubheadline: "A highly-curated showroom of high-performance electric vehicles.",
      aboutBlurb: "Evo Motors boutique EV dealership demo.",
    },
  });

  // 3. Create Owner for Demo Org
  const demoOwnerEmail = "owner@evomotors.demo";
  const passwordHash = await bcrypt.hash("demoowner123", 10);

  await prisma.user.upsert({
    where: { email: demoOwnerEmail },
    update: {
      role: Role.OWNER,
      organizationId: evoMotors.id,
    },
    create: {
      email: demoOwnerEmail,
      firstName: "Evo",
      lastName: "Owner",
      role: Role.OWNER,
      passwordHash,
      isStub: false,
      organizationId: evoMotors.id,
    },
  });

  console.log(`✅ Demo Organization: ${evoMotors.name} (${evoMotors.slug})`);
  console.log(`✅ Demo Owner: ${demoOwnerEmail}`);
  
  // 4. Backfill existing orphaned data to demo org
  console.log("Backfilling orphaned records to demo org...");
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
    try {
      const result = await (item.model as any).updateMany({
        where: { organizationId: null },
        data: { organizationId: evoMotors.id },
      });
      if (result.count > 0) {
        console.log(`   Backfilled ${result.count} ${item.name} records.`);
      }
    } catch (e) {
      // Ignore models where organizationId is required
    }
  }

  console.log("--- Demo Seed Complete ---");
}

async function main() {
  const mode = process.env.SEED_MODE || "BOOTSTRAP";
  
  await seedBootstrap();

  if (mode === "DEMO") {
    await seedDemo();
  }
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
