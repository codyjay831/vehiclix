# Evo Motors Deals: Risks & Anti-Patterns

## Defensive Design (Locked Out-of-Scope)
This document outlines what we should NOT do during the development of the new Deal workflow to prevent technical debt and operational drift.

### 1. Do NOT make the Vehicle the Parent
- **Risk**: Storing `dealId` on the `Vehicle` model as the primary relationship.
- **Why**: A vehicle can have multiple historic deals. The Deal should point to the Vehicle, and the Vehicle should have its own status. 
- **Anti-Pattern**: Using `Vehicle.dealId` to check if a car is in a deal.
- **Better Way**: Query the `Deal` table for an active deal (`status NOT IN [COMPLETED, CANCELLED]`) that matches the `vehicleId`.

### 2. Do NOT use Live Inventory Pricing as Authoritative
- **Risk**: Pulling the `Vehicle.price` dynamically into the Purchase Agreement or Deal Jacket during negotiation.
- **Why**: Dealers change inventory prices (marketing) frequently. A deal is a contract at a specific price at a specific point in time.
- **Anti-Pattern**: Re-calculating the final total from the inventory record every time the page loads.
- **Better Way**: Snapshot `sellingPriceSnapshot` at Deal creation and only update it if explicitly re-negotiated in the Deal Jacket.

### 3. Do NOT allow Silent Vehicle Conflict Conditions
- **Risk**: Allowing two staff members to start a deal on the same car simultaneously.
- **Why**: Creates confusion, double-deposits, and lost trust.
- **Anti-Pattern**: Only checking for active deals at the "Save" step of the wizard.
- **Better Way**: Implement a `VehicleUnavailable` warning at the FIRST step of the wizard (VIN selection) if an active deal exists.

### 4. Do NOT require all Information Up Front
- **Risk**: Forcing staff to enter ID, Insurance, and Financing details before they can save a "Draft" deal.
- **Why**: Real deals are messy and iterative.
- **Anti-Pattern**: Making all deal fields mandatory in the Prisma schema.
- **Better Way**: Allow a `DRAFT` status with just the primary buyer relationship (currently `userId`) and `vehicleId`. Use the `READY_FOR_DELIVERY` gate to enforce completeness at the end of the flow.

### 5. Do NOT overbuild Phase 1
- **Risk**: Implementing full trade-in logic, co-buyer logic, and lender APIs in the first week.
- **Why**: Bloats the MVP and delays the deployment of the guided flow.
- **Anti-Pattern**: Adding 10+ new models to the schema in Phase 1A.
- **Better Way**: Use the existing `Deal` and `User` models, and add minimal fields + JSON metadata for checklists/stips.

### 6. Do NOT implement Multiple Active Deals per Vehicle
- **Risk**: Supporting "Backup Deals" as a core feature too early.
- **Why**: Significantly increases the complexity of inventory locking and status management.
- **Anti-Pattern**: Removing the "one-active-deal" constraint to accommodate rare edge cases.
- **Better Way**: Force existing active deals to be `CANCELLED` before a new one can be started for the same VIN.

### 7. Do NOT mix "Delivery-Ready" with "Funded-Ready"
- **Risk**: Releasing the car before the money has cleared (or vice versa).
- **Why**: Operational risk for the dealer.
- **Anti-Pattern**: A single status for "Ready".
- **Better Way**: Separate "Milestones" (Checklist) from the Top-level Deal Status. A deal can be `READY_FOR_DELIVERY` (Physical) but still `AWAITING_FUNDING` (Financial).

### 8. Do NOT allow Silent Vehicle Swaps
- **Risk**: Changing the VIN on a deal without auditing the change or re-validating the commercial terms.
- **Why**: High risk for mis-titling and inventory errors.
- **Anti-Pattern**: A simple dropdown to change the vehicle in the Deal Jacket.
- **Better Way**: Use a formal "Swap Vehicle" workflow that logs the history, releases the old VIN, and requires re-confirming the new commercial snapshot.

### 9. Do NOT use Unaudited Manager Overrides
- **Risk**: Staff or managers bypassing system gates without accountability.
- **Why**: Compliance risk and difficulty in troubleshooting deal failures.
- **Anti-Pattern**: A "Force Clear" button with no documentation.
- **Better Way**: Require a reason code and log the actor's identity for every gate bypass.

### 10. Do NOT conflate Deposit with Final Payment
- **Risk**: Treating all money received as the same type of transaction.
- **Why**: Different tender rules (e.g., credit card for deposit only) and different reconciliation paths.
- **Anti-Pattern**: A single `amountPaid` field on the Deal.
- **Better Way**: Model `DealDeposit` and `DealFinalPayment` (or individual `DealFunding` entries) with distinct tender types.
