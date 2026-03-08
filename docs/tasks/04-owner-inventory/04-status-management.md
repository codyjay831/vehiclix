Title: Task 04.04 - Vehicle Status Management
Purpose: Implement the vehicle status transition machine in the admin UI.
Files likely touched: src/components/StatusDropdown.tsx, src/lib/actions/status.ts
Implementation steps:
1. Create a `StatusDropdown.tsx` that reflects the transition matrix in Doc 10, Scenario C.
2. Implement confirmation dialogs for destructive or significant status changes (e.g., Listed → Reserved).
3. Ensure the public site visibility updates immediately upon status changes.
Acceptance criteria:
- Only valid transitions are shown based on the current status (Test INV-006, INV-007).
- Confirmation dialogs appear as required.
- Status changes propagate to the public site immediately.
Dependencies: Task 04.01, Task 02.02
Related epic: 04 — Owner Inventory Management
Related acceptance tests: INV-006, INV-007, INV-009, INV-010
