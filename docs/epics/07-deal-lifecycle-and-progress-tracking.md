# 07 — Deal Lifecycle and Progress Tracking

## 1. Epic Title
Deal Orchestration and Progress Tracking

## 2. Purpose
Create the central transaction engine that moves a vehicle from "Reserved" to "Sold." This epic manages the multi-step deal lifecycle and keeps the customer informed via the portal milestone tracker.

## 3. User / Business Value
Provides the structural "spine" of the platform. Clear status tracking ensures both the Owner and Customer know exactly where they are in the complex 14-30 day vehicle purchase lifecycle.

## 4. Canon Dependencies
- `docs/canon/01` (Deal States)
- `docs/canon/03` (Journey 1)
- `docs/canon/05` (Deal Domain)
- `docs/canon/10` (Scenario O, R)
- `docs/canon/11` (Deal Mapping)
- `docs/canon/12` (XSY Tests)

## 5. In Scope
- **Deal Model:** Central link between `Customer`, `Vehicle`, `Deposit`, and `Documents`.
- **Owner Deal Management (`/admin/deals`):**
  - Table view of all deals with stage-based filtering.
  - Detail view with deal timeline, linked inquiry, and action buttons.
  - Status management: `Lead → Deposit Pending → Deposit Received → Documents Pending → Contracts Sent → Contracts Signed → Financing Pending → Ready for Delivery → Completed`.
- **Customer Milestone Tracker:**
  - Visual progress bar in portal (Scenario R).
  - Status-friendly labels (e.g., `Deposit Received` → "Vehicle Reserved").
  - Dynamic "Next Action" cards based on deal stage.
- **Vehicle Syncing:** Automatic status updates (e.g., `Deal.Completed` → `Vehicle.Sold`).
- **Cancellation Flow:** Releasing a reservation and returning the vehicle to `Listed`.

## 6. Out of Scope
- Actual Stripe payment processing (Epic 08).
- DocuSign API integration (Epic 09).
- Automated financing approval (manual offline step).

## 7. Actors
- Customer
- Owner

## 8. Core Entities Touched
- `Deal`
- `Vehicle` (Status updates)
- `Customer`
- `ActivityEvent` (Timeline)

## 9. Main User Flows
- **Tracking:** Customer logs into portal to see "Awaiting Your Documentation" status (Scenario R).
- **Fulfillment:** Owner moves a deal from "Contracts Signed" to "Financing Pending" after reviewing offline docs.
- **Closing:** Owner marks deal "Completed"; vehicle is removed from inventory.

## 10. Owner/Admin Flows
- Triage: Filtering deals by "Ready for Delivery" to schedule handoffs.
- Cleanup: Cancelling abandoned deals to free up inventory.

## 11. States and Transitions
- Full Deal Lifecycle: `Lead → Deposit Received → Documents Pending → Contracts Sent → Contracts Signed → Financing Pending → Ready for Delivery → Completed | Cancelled`.

## 12. UI Surfaces
- `/admin/deals` (List + Detail)
- `/portal/deals/[id]` (Customer View)
- `MilestoneTracker` component.

## 13. API / Backend Responsibilities
- Atomic state transitions.
- Automatic coupling between Deal and Vehicle status.
- Timeline generation from `ActivityEvent` logs.
- Validation: Cannot mark "Completed" if contracts aren't signed (Owner-enforced).

## 14. Security / Audit Requirements
- strictly owner-only deal management.
- strictly customer-only deal tracking (limited to their own ID).
- Audit Logging: `deal.created`, `deal.status_changed`, `deal.cancelled`.

## 15. Acceptance Criteria
- [ ] Portal dashboard correctly reflects the current deal stage with friendly labels (Test DEP-005).
- [ ] Owner can progress deal stages in admin (Scenario D/E).
- [ ] Marking a deal "Completed" moves the vehicle status to "Sold" (Test INV-007).
- [ ] Cancelling a deal returns the vehicle to "Listed" status (Test XSY-006).
- [ ] Milestone tracker highlights the current step and check-marks past steps.

## 16. Edge Cases / Failure Cases
- **Stale Reservation:** Owner must manually cancel a deal if a customer abandons the process after deposit.
- **Status Sync Failure:** If a deal is cancelled, the vehicle MUST return to Listed to prevent "locked" inventory.

## 17. Dependencies on Other Epics
- `Epic 01` (Foundation).
- `Epic 04` (Inventory).
- `Epic 03` (Portal Shell).

## 18. Deferred Items / Notes
- Automated status notification emails.
- Multi-buyer deals (co-signers).
