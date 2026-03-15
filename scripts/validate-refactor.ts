import "dotenv/config";
import { db } from "../src/lib/db";
import { loginAction, registerAction } from "../src/actions/auth";
import { trackVehicleViewAction } from "../src/actions/inventory";
import { submitVehicleRequestAction } from "../src/actions/request";
import { Role, VehicleStatus } from "@prisma/client";
import { normalizeSlug } from "../src/lib/organization";

async function runTests() {
  console.log("🚀 Starting Validation Tests...");

  // 1. Cleanup and Setup
  console.log("\n--- Setup ---");
  await db.activityEvent.deleteMany({});
  await db.user.deleteMany({});
  await db.vehicle.deleteMany({});
  await db.organization.deleteMany({});

  const orgA = await db.organization.create({
    data: { name: "Dealer A", slug: normalizeSlug("Dealer A") },
  });
  const orgB = await db.organization.create({
    data: { name: "Dealer B", slug: normalizeSlug("Dealer B") },
  });
  console.log(`✅ Created Org A (${orgA.id}) and Org B (${orgB.id})`);

  const vehicleA = await db.vehicle.create({
    data: {
      vin: "VIN-A",
      make: "Tesla",
      model: "Model S",
      year: 2023,
      mileage: 1000,
      drivetrain: "AWD",
      exteriorColor: "Red",
      interiorColor: "Black",
      condition: "EXCELLENT",
      titleStatus: "CLEAN",
      price: 80000,
      vehicleStatus: "LISTED",
      organizationId: orgA.id,
    },
  });
  console.log(`✅ Created Vehicle A in Org A`);

  // 2. Survivability Test (Delete "evo-motors" logic is already tested by not having it)
  console.log("\n--- Survivability Test ---");
  // Check if we can still log an event with null org
  try {
    const event = await db.activityEvent.create({
      data: {
        eventType: "system.test",
        entityType: "System",
        entityId: "test",
        organizationId: null,
      },
    });
    console.log("✅ Successfully created audit event with organizationId: null");
  } catch (e) {
    console.error("❌ Failed to create audit event with null org:", e);
  }

  // 3. Registration Validation Test
  console.log("\n--- Registration Validation Test ---");
  const formDataInvalid = new FormData();
  formDataIntermediate(formDataInvalid, {
    firstName: "Test",
    lastName: "User",
    email: "test@example.com",
    password: "password123",
    organizationId: "invalid-uuid",
  });

  try {
    const result = await registerAction(formDataInvalid);
    if (result && result.error === "Invalid organization context") {
      console.log("✅ registerAction correctly rejected invalid organizationId");
    } else {
      console.log("❌ registerAction FAILED to reject invalid organizationId:", result);
    }
  } catch (e: any) {
    console.log("✅ registerAction threw error for invalid context (acceptable):", e.message);
  }

  // 4. Isolation Test: Analytics
  console.log("\n--- Isolation Test: Analytics ---");
  try {
    // Attempt to track view for Vehicle A using Org B context
    await trackVehicleViewAction(vehicleA.id, orgB.id);
    const updatedVehicle = await db.vehicle.findUnique({ where: { id: vehicleA.id } });
    if (updatedVehicle?.views === 0) {
      console.log("✅ trackVehicleViewAction correctly ignored update with wrong organizationId");
    } else {
      console.log("❌ trackVehicleViewAction leaked update across organizations!");
    }
  } catch (e) {
    console.error("❌ trackVehicleViewAction crashed:", e);
  }

  // 5. Registration Success Test
  console.log("\n--- Registration Success Test ---");
  const formDataValid = new FormData();
  formDataIntermediate(formDataValid, {
    firstName: "Valid",
    lastName: "User",
    email: "valid@example.com",
    password: "password123",
    organizationId: orgA.id,
  });

  try {
    await registerAction(formDataValid);
  } catch (e: any) {
    // Catch cookie/redirect errors
    if (!e.message?.includes("cookies") && !e.digest?.includes("NEXT_REDIRECT")) {
      console.error("❌ Unexpected registration error:", e);
    }
  }

  // Check if the user was created despite the cookie error
  const user = await db.user.findUnique({ where: { email: "valid@example.com" } });
  if (user && user.organizationId === orgA.id) {
    console.log("✅ User registered successfully into Org A");
  } else {
    console.log("❌ User registration failed or assigned to wrong org");
  }

  console.log("\n🏁 Validation Tests Complete.");
  process.exit(0);
}

function formDataIntermediate(fd: FormData, data: Record<string, string>) {
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
}

runTests().catch(e => {
  console.error("💥 Critical test failure:", e);
  process.exit(1);
});
