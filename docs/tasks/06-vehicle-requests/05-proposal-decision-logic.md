Title: Task 06.05 - Proposal Accept/Decline Logic
Purpose: Implement the customer's decision logic for vehicle proposals.
Files likely touched: src/lib/actions/proposal.ts, src/app/portal/requests/[id]/page.tsx
Implementation steps:
1. Implement server actions for `acceptProposal` and `declineProposal`.
2. Update `VehicleProposal` status to `Customer Accepted` or `Customer Declined`.
3. Update `VehicleRequest` status to `Customer Approved` on acceptance.
4. If accepted, show a next-steps confirmation message to the customer.
Acceptance criteria:
- "Accept" updates the proposal and request statuses correctly (Test REQ-005).
- Customer sees the next-steps message after accepting.
Dependencies: Task 06.04
Related epic: 06 — Vehicle Request and Proposal System
Related acceptance tests: REQ-005
