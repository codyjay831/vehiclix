Title: Task 04.01 - Admin Inventory Table
Purpose: Provide an overview of all vehicles in the admin dashboard.
Files likely touched: src/app/admin/inventory/page.tsx, src/components/AdminInventoryTable.tsx
Implementation steps:
1. Create `src/app/admin/inventory/page.tsx` with a header and "Add Vehicle" button.
2. Implement `AdminInventoryTable.tsx` using shadcn/ui `Table` with sortable columns for Year/Make/Model, Price, Status.
3. Add a "Status" badge and an action menu (three dots) for each row.
4. Filter out `Archived` vehicles by default, with a toggle to show them (Doc 10, Scenario C).
Acceptance criteria:
- Admin table correctly displays all vehicles and their statuses.
- "Add Vehicle" button links to the creation form.
- Status filters work as expected.
Dependencies: Task 01.02, Task 01.03
Related epic: 04 — Owner Inventory Management
Related acceptance tests: INV-001 (entry point), INV-009
