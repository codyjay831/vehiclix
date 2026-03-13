import "dotenv/config";
import { getActiveDeal, getRecentInquiries, getRecentRequests } from "../src/lib/portal";

const customerId = "c0604eea-443a-4878-ac00-bbe1730e45a1";
const pilotOrgId = "faef5db9-fc06-4567-bfac-e99a7e697fb1";
const evoOrgId = "2f864538-ab68-4c05-84c5-3234e8970dc6";

async function verifyPortal() {
  console.log("=== STEP 6: PORTAL FUNCTIONALITY VERIFICATION ===\n");

  // 1. Fetch Portal Data with Pilot Org context
  const [activeDeal, recentInquiries, recentRequests] = await Promise.all([
    getActiveDeal(customerId, pilotOrgId),
    getRecentInquiries(customerId, pilotOrgId),
    getRecentRequests(customerId, pilotOrgId),
  ]);

  console.log(`- Active Deal found for Pilot Org: ${!!activeDeal}`);
  console.log(`- Recent Inquiries count for Pilot Org: ${recentInquiries.length}`);
  console.log(`- Recent Requests count for Pilot Org: ${recentRequests.length}`);

  // 2. Fetch Portal Data with Evo Org context (Should fail or be empty)
  // Since customer belongs to Pilot Org, query with Evo Org context should theoretically return 0 
  // because the filters now strictly check organizationId.
  const [activeDealEvo, recentInquiriesEvo] = await Promise.all([
    getActiveDeal(customerId, evoOrgId),
    getRecentInquiries(customerId, evoOrgId),
  ]);

  console.log(`- Active Deal found for Evo Org: ${!!activeDealEvo}`);
  console.log(`- Recent Inquiries count for Evo Org: ${recentInquiriesEvo.length}`);

  const isIsolated = !activeDealEvo && recentInquiriesEvo.length === 0;
  console.log(`\nPORTAL VERIFIED: ${isIsolated ? "PASS" : "FAIL"}`);
}

verifyPortal()
  .catch(console.error);
