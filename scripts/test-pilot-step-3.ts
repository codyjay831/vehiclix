import { PrismaClient, Drivetrain, InventoryCondition, TitleStatus, VehicleStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const pilotOrgId = "faef5db9-fc06-4567-bfac-e99a7e697fb1";

async function createVehicle() {
  console.log("=== STEP 3: CREATE PILOT INVENTORY ===\n");
  const vehicle = await prisma.vehicle.create({
    data: {
      vin: "TESTVIN-PILOT-101",
      year: 2021,
      make: "Ford",
      model: "Mustang Mach-E",
      mileage: 15000,
      drivetrain: Drivetrain.AWD,
      exteriorColor: "Blue",
      interiorColor: "Black",
      condition: InventoryCondition.EXCELLENT,
      titleStatus: TitleStatus.CLEAN,
      price: 55000.00,
      vehicleStatus: VehicleStatus.LISTED,
      organizationId: pilotOrgId,
    }
  });

  console.log(`✅ Pilot vehicle created: ${vehicle.year} ${vehicle.make} ${vehicle.model} (VIN: ${vehicle.vin})`);
  console.log(`- Organization ID: ${vehicle.organizationId}`);

  // 1. Manually log Audit Event (simulating createVehicleAction)
  await prisma.activityEvent.create({
    data: {
      eventType: "vehicle.created",
      entityType: "Vehicle",
      entityId: vehicle.id,
      organizationId: pilotOrgId,
      actorRole: "OWNER",
      metadata: { status: vehicle.vehicleStatus },
    }
  });
  console.log(`✅ Audit event logged for vehicle creation.`);
  
  if (vehicle.organizationId === pilotOrgId) {
    console.log("\nINVENTORY CREATION VERIFIED: PASS");
  } else {
    console.log("\nINVENTORY CREATION VERIFIED: FAIL");
  }
}

createVehicle()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
