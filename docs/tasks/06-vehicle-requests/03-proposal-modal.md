Title: Task 06.03 - Admin Proposal Modal
Purpose: Allow the owner to send vehicle proposals to customers for sourcing requests.
Files likely touched: src/components/ProposalModal.tsx, src/lib/actions/proposal.ts
Implementation steps:
1. Create `ProposalModal.tsx` that opens from the request detail page (Doc 10, Scenario H).
2. Implement a server action `sendProposal` that:
   - Creates a `VehicleProposal` record (status: `Proposed`).
   - Updates the parent `VehicleRequest` status to `Vehicle Proposed`.
3. Add fields for VIN, make/model/year, mileage, price, and photos.
Acceptance criteria:
- Owner can create and send proposals from the request detail page (Test REQ-004).
- Proposal record is created and linked correctly.
- Request status updates to "Vehicle Proposed".
Dependencies: Task 06.02, Task 01.02
Related epic: 06 — Vehicle Request and Proposal System
Related acceptance tests: REQ-004
