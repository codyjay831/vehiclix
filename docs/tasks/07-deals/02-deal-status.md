Title: Task 07.02 - Deal Status Management
Purpose: Implement the deal status transition logic in the admin UI.
Files likely touched: src/app/admin/deals/[id]/page.tsx, src/lib/actions/deal.ts
Implementation steps:
1. Implement status update actions in `src/lib/actions/deal.ts` (Lead → Deposit Pending → Deposit Received → ... → Completed).
2. Add status-specific action buttons to the deal detail page.
3. Include confirmation dialogs for significant transitions (e.g., Marking a deal Completed).
Acceptance criteria:
- Owner can manually progress deal stages in the admin view (Test INQ-005, INV-007).
- Confirmation dialogs appear as required.
- Deal status correctly reflects the current transaction stage.
Dependencies: Task 07.01
Related epic: 07 — Deal Lifecycle and Progress Tracking
Related acceptance tests: INQ-005, INV-007
