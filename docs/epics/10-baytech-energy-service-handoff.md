# 10 — Baytech Energy Service Handoff

## 1. Epic Title
Baytech Energy Lead Capture and Handoff

## 2. Purpose
Implement the referral flow for home energy services (EV chargers and solar), facilitating a clean lead handoff to Baytech Smart Homes as part of the holistic EV ownership experience.

## 3. User / Business Value
Positions Evo Motors as a full-solution provider. Generates ancillary business value through referral leads while maintaining a zero-operational-overhead model for the dealer.

## 4. Canon Dependencies
- `docs/canon/01` (Baytech Rules)
- `docs/canon/06` (Baytech Domain)
- `docs/canon/08` (Energy UX Rules)
- `docs/canon/11` (Baytech Mapping)

## 5. In Scope
- **Lead Capture UI:**
  - Optional "Home Energy" section on VDP (Scenario K).
  - Portal "Add-On" cards for Charger/Solar installation.
  - Simple form: Property Address and Service Preference.
- **Owner View (`/admin/baytech`):**
  - List of all energy leads (Customer, Deal, Service Type, Address, Notes).
  - Manual status update to track handoff.
- **Customer Visibility:**
  - Status indicator in portal: "Interest Shared with Baytech."
- **Data Model:** `EnergyServiceRequest` linked to Customer and optional Deal.

## 6. Out of Scope
- Scheduling site surveys or installations.
- Collecting electrical photos or diagrams.
- Quoting or invoicing for Baytech services.
- Contractor/Technician login roles.

## 7. Actors
- Customer
- Owner
- Baytech (Receives leads via Owner follow-up)

## 8. Core Entities Touched
- `EnergyServiceRequest`
- `Customer`
- `Deal` (optional linkage)

## 9. Main User Flows
- **Interest:** Customer checks "Interested in EV Charger" during vehicle purchase.
- **Handoff:** System records lead; informs customer "Baytech will reach out."
- **Tracking:** Owner views the lead in admin and calls/emails Baytech staff manually.

## 10. Owner/Admin Flows
- Exporting the weekly lead list to share with the Baytech installation team.
- Updating status from "Submitted" to "Acknowledged" after handoff.

## 11. States and Transitions
- `EnergyServiceStatus`: `Interest Captured → Submitted to Baytech → Acknowledged → Contact Pending → Closed`.

## 12. UI Surfaces
- VDP (Section)
- Portal Dashboard (Section/Card)
- `/admin/baytech` (List)

## 13. API / Backend Responsibilities
- Lead capture endpoint.
- Logic to link lead to an active deal if submitted during purchase.
- Audit history for status changes.

## 14. Security / Audit Requirements
- Lead data is Owner-only (PII protection).
- Audit Logging: `baytech_lead.captured`.
- Strictly no access for external Baytech staff (Evo Owner role is the bridge).

## 15. Acceptance Criteria
- [ ] Customer can submit interest and property address from the portal.
- [ ] Energy lead appears in `/admin/baytech` with correct customer and vehicle links.
- [ ] Handoff status is visible to the customer as a simple label (e.g., "Received").
- [ ] No installation scheduling or payment features exist.

## 16. Edge Cases / Failure Cases
- **Incomplete Address:** Validation requires a valid property address before submission.
- **Multiple Leads:** Customer can request BOTH charger and solar; these create two separate lead records.

## 17. Dependencies on Other Epics
- `Epic 07` (Deal Lifecycle context).
- `Epic 03` (Portal).

## 18. Deferred Items / Notes
- Automated API push to Baytech's CRM (HubSpot/Salesforce).
- Direct site-survey scheduling integration.
