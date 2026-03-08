Title: Task 06.02 - Admin Request List and Detail
Purpose: Allow the owner to manage incoming vehicle sourcing requests.
Files likely touched: src/app/admin/requests/page.tsx, src/app/admin/requests/[id]/page.tsx, src/components/RequestList.tsx
Implementation steps:
1. Create `src/app/admin/requests/page.tsx` with a data table of all `VehicleRequest` records.
2. Implement `RequestList.tsx` with columns for customer, desired vehicle, budget, and status.
3. Create `src/app/admin/requests/[id]/page.tsx` for the detail view (Doc 10, Scenario G).
4. Render all customer preferences and a section for owner notes.
Acceptance criteria:
- Admin requests list displays all submissions correctly (Test REQ-002).
- Clicking a request opens the detail view with full context.
Dependencies: Task 06.01, Task 01.03
Related epic: 06 — Vehicle Request and Proposal System
Related acceptance tests: REQ-002
