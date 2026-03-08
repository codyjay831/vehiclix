Title: Task 05.03 - Inquiry-to-Deal Conversion Modal
Purpose: Allow the owner to convert a high-intent inquiry into a formal deal record.
Files likely touched: src/components/DealConversionModal.tsx, src/lib/actions/deal.ts
Implementation steps:
1. Create `DealConversionModal.tsx` that opens from the inquiry detail page (Doc 10, Scenario E).
2. Pre-fill the modal with customer and vehicle data.
3. Implement a server action `convertToDeal` that:
   - Creates a `Deal` record (status: `Lead` or `Deposit Pending`).
   - Ensures the `Vehicle` is `Listed`.
   - Updates the `VehicleInquiry` status to `Converted`.
   - Links the inquiry to the new deal.
Acceptance criteria:
- Converting an inquiry creates a linked `Deal` record (Test INQ-005).
- Inquiry status correctly updates to "Converted".
- Duplicate deal prevention works as expected.
Dependencies: Task 05.02, Task 01.02
Related epic: 05 — Inquiries, Trade-Ins, and Financing Interest
Related acceptance tests: INQ-005
