Title: Task 06.06 - Request to Deal Conversion
Purpose: Allow the owner to convert an approved sourcing request into a deal.
Files likely touched: src/app/admin/requests/[id]/page.tsx, src/lib/actions/deal.ts
Implementation steps:
1. Add a "Convert to Deal" button to the admin request detail page (Scenario H).
2. Implement the conversion logic that:
   - Prompts for (or creates) a `Vehicle` record for the sourced car.
   - Creates a `Deal` record linking the customer and the vehicle.
   - Updates the `VehicleRequest` status to `Converted to Deal`.
Acceptance criteria:
- Approved requests can be converted into deals by the owner (Test REQ-006).
- All records (Request, Deal, Vehicle, Customer) are correctly linked.
Dependencies: Task 06.05, Task 07.01
Related epic: 06 — Vehicle Request and Proposal System
Related acceptance tests: REQ-006
