Title: Task 06.01 - Vehicle Request Submission Form
Purpose: Allow customers to submit sourcing requests for non-inventoried vehicles.
Files likely touched: src/app/request-vehicle/page.tsx, src/lib/actions/request.ts
Implementation steps:
1. Create `src/app/request-vehicle/page.tsx` with a multi-section form (Doc 10, Scenario N).
2. Implement server action `submitRequest` that creates a `VehicleRequest` record.
3. Handle the confirmation page with next-step expectations (Scenario N).
4. Link the request to a stub `Customer` if not logged in.
Acceptance criteria:
- Vehicle request form validates all required fields (Test REQ-001).
- Request record is created with status `Submitted`.
- Redirect to confirmation page works as expected.
Dependencies: Task 01.02, Task 01.03
Related epic: 06 — Vehicle Request and Proposal System
Related acceptance tests: REQ-001
