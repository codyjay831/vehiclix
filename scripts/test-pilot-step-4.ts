import "dotenv/config";
import { getPublicInventory } from "../src/lib/inventory";

const pilotOrgId = "faef5db9-fc06-4567-bfac-e99a7e697fb1";
const evoOrgId = "2f864538-ab68-4c05-84c5-3234e8970dc6";

async function verifyPublicInventory() {
  console.log("=== STEP 4: PUBLIC INVENTORY SEPARATION VERIFICATION ===\n");

  // 1. Check Pilot Dealer Public Inventory
  const pilotPublic = await getPublicInventory(pilotOrgId);
  console.log(`- Pilot Dealer Public Inventory Count: ${pilotPublic.length}`);
  const hasPilotVehicle = pilotPublic.some(v => v.vin === "TESTVIN-PILOT-100");
  console.log(`- Contains TESTVIN-PILOT-100? ${hasPilotVehicle}`);

  // 2. Check Evo Motors Public Inventory
  const evoPublic = await getPublicInventory(evoOrgId);
  console.log(`- Evo Motors Public Inventory Count: ${evoPublic.length}`);
  const containsPilotVehicleInEvo = evoPublic.some(v => v.vin === "TESTVIN-PILOT-100");
  console.log(`- Contains TESTVIN-PILOT-100 in Evo? ${containsPilotVehicleInEvo}`);

  const isSeparated = hasPilotVehicle && !containsPilotVehicleInEvo;
  console.log(`\nPUBLIC INVENTORY VERIFIED: ${isSeparated ? "PASS" : "FAIL"}`);
}

verifyPublicInventory()
  .catch(console.error);
