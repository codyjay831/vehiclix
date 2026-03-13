import "dotenv/config";
import { getAdminInventory } from "../src/lib/inventory";

const pilotOrgId = "faef5db9-fc06-4567-bfac-e99a7e697fb1";
const evoOrgId = "2f864538-ab68-4c05-84c5-3234e8970dc6";

async function verifyCrossTenantVisibility() {
  console.log("=== STEP 8: CROSS-TENANT VISIBILITY CHECK (EVO ADMIN) ===\n");

  // 1. Fetch Evo Motors Admin Inventory
  const evoInventory = await getAdminInventory(evoOrgId);
  console.log(`- Evo Motors Admin Inventory Count: ${evoInventory.length}`);

  // 2. Check if any Pilot Dealer vehicle appears in Evo Motors admin inventory
  const hasPilotVehicleInEvo = evoInventory.some(v => v.organizationId === pilotOrgId);
  console.log(`- Pilot Dealer vehicle visible to Evo Admin? ${hasPilotVehicleInEvo}`);

  const isIsolated = !hasPilotVehicleInEvo;
  console.log(`\nCROSS-TENANT CHECK VERIFIED: ${isIsolated ? "PASS" : "FAIL"}`);
}

verifyCrossTenantVisibility()
  .catch(console.error);
