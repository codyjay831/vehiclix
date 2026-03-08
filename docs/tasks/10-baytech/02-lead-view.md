Title: Task 10.02 - Admin Energy Lead View
Purpose: Allow the owner to review and manage energy leads for Baytech.
Files likely touched: src/app/admin/baytech/page.tsx, src/components/EnergyLeadList.tsx
Implementation steps:
1. Create `src/app/admin/baytech/page.tsx` with a data table of all `EnergyServiceRequest` records.
2. Implement `EnergyLeadList.tsx` with columns for customer, service type, address, deal link, and status.
3. Add a detail view for each lead with owner notes (Doc 06, 6).
Acceptance criteria:
- Admin leads list displays all submissions correctly.
- Clicking a lead opens the detail view with full context.
Dependencies: Task 10.01, Task 01.03
Related epic: 10 — Baytech Energy Service Handoff
Related acceptance tests: None
