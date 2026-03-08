Title: Task 02.02 - Inventory List (Grid + Cards)
Purpose: Display a responsive grid of available (Listed) vehicles.
Files likely touched: src/app/inventory/page.tsx, src/components/VehicleCard.tsx
Implementation steps:
1. Create `src/app/inventory/page.tsx` that fetches `Listed` vehicles using Prisma.
2. Implement `VehicleCard.tsx` with primary photo, year/make/model, price, mileage, range, and drivetrain (Doc 10, Scenario I).
3. Handle the "Empty State" if zero vehicles are listed (Doc 10, Scenario I).
Acceptance criteria:
- `/inventory` displays cards for all `Listed` vehicles (Test BRW-001).
- Empty state renders if no vehicles are available (Test BRW-004).
Dependencies: Task 01.02, Task 02.01
Related epic: 02 — Public Showroom and Content
Related acceptance tests: BRW-001, BRW-004
