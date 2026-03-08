Title: Task 07.01 - Deal List and Detail (Admin)
Purpose: Centralize the management of all active car purchases.
Files likely touched: src/app/admin/deals/page.tsx, src/app/admin/deals/[id]/page.tsx, src/components/DealList.tsx
Implementation steps:
1. Create `src/app/admin/deals/page.tsx` with a data table of all `Deal` records.
2. Implement `DealList.tsx` with columns for date, customer, vehicle, status, and price.
3. Create `src/app/admin/deals/[id]/page.tsx` for the detail view (Doc 10, Scenario D).
4. Render the deal timeline, linked vehicle summary, customer info, and deposit status.
Acceptance criteria:
- Admin deal list displays all transactions with stage-based filtering.
- Clicking a deal opens the detail view with full context.
Dependencies: Task 01.02, Task 01.03
Related epic: 07 — Deal Lifecycle and Progress Tracking
Related acceptance tests: DEP-006 (entry point)
