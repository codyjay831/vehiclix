Title: Task 04.02 - Vehicle Add/Edit Form
Purpose: Provide the multi-section form for creating and updating vehicle data.
Files likely touched: src/app/admin/inventory/[id]/edit/page.tsx, src/components/VehicleForm.tsx
Implementation steps:
1. Create a `VehicleForm.tsx` with all 7 sections defined in Doc 10, Scenario A.
2. Implement server actions for `createVehicle` and `updateVehicle`.
3. Add form validation for VIN, mileage, price, etc.
4. Implement "Draft" vs. "Publish" logic (Doc 10, Scenario A, B).
5. Add a "Dirty State" warning for unsaved changes (Doc 10, 3.6).
Acceptance criteria:
- Owner can save a draft with minimal fields (Test INV-001).
- Publish fails without a description and at least one photo (Test INV-002).
- Dirty state warning triggers on navigation with unsaved changes.
Dependencies: Task 04.01, Task 01.04
Related epic: 04 — Owner Inventory Management
Related acceptance tests: INV-001, INV-002, INV-004
