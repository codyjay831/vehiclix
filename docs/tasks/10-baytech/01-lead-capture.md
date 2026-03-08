Title: Task 10.01 - Energy Lead Capture (VDP & Portal)
Purpose: Capture interest in home energy services from customers during the vehicle purchase.
Files likely touched: src/components/EnergySection.tsx, src/lib/actions/energy.ts
Implementation steps:
1. Create `EnergySection.tsx` as an optional add-on for the VDP and the portal dashboard.
2. Implement a simple form capturing property address and service type (Charger or Solar).
3. Create a server action `submitEnergyInterest` that creates an `EnergyServiceRequest` record.
4. If submitted from a VDP, link it to the vehicle; if from a portal, link it to the active deal.
Acceptance criteria:
- Customers can submit their interest in home energy services (Test TRD-001 boundary).
- Energy lead appears in the database with correct context (Customer, Address, Service).
Dependencies: Task 02.04, Task 03.04
Related epic: 10 — Baytech Energy Service Handoff
Related acceptance tests: None (feature-specific)
