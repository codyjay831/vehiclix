# 06 — Vehicle Request and Proposal System

## 1. Epic Title
"Find Me This Car": Vehicle Sourcing and Proposals

## 2. Purpose
Manage the sourcing workflow for customers looking for specific EVs not in inventory. Covers the journey from request submission to auction-sourced proposals and customer approval.

## 3. User / Business Value
Expands the dealership's "virtual inventory" without carrying the cost of floorplan. Provides a highly personalized sourcing service that builds deep customer loyalty.

## 4. Canon Dependencies
- `docs/canon/01` (Request States)
- `docs/canon/03` (Journey 2)
- `docs/canon/04` (Request Entities)
- `docs/canon/10` (Scenarios G, H, N)
- `docs/canon/11` (Request Mapping)
- `docs/canon/12` (REQ Tests)

## 5. In Scope
- **Request Submission Form (`/request-vehicle`):**
  - Section-based form (Make, Model, Year, Budget, Timeline).
  - Confirmation page with next-step expectations (Scenario N).
- **Owner Request Management (`/admin/requests`):**
  - List of all requests with status and priority tags.
  - Detail view with customer preferences and threaded owner notes (Scenario G).
  - Status management: `Submitted → Under Review → Sourcing → Vehicle Proposed → Customer Approved → Converted`.
- **Proposal System:**
  - Owner creates `VehicleProposal` (VIN, Mileage, Estimated Price, Photos).
  - Customer receives notification (portal indicator).
  - Customer views proposal in portal and clicks "Accept" or "Decline" (Scenario H).
- **Conversion Flow:**
  - Approved request moves to "Converted to Deal."
  - Owner manually triggers Deal creation once the sourced car is acquired.

## 6. Out of Scope
- Automated auction feeds (Doc 09).
- Bidding history visibility for customers.
- Direct purchase of proposals without dealer acquisition.

## 7. Actors
- Customer
- Owner

## 8. Core Entities Touched
- `VehicleRequest`
- `VehicleProposal`
- `Deal` (on conversion)
- `Vehicle` (on acquisition)

## 9. Main User Flows
- **Sourcing Need:** Customer submits request for a 2023 Tesla Model Y (Scenario N).
- **Fulfillment:** Owner finds a match, sends a proposal with 3 auction photos (Scenario H).
- **Conversion:** Customer accepts proposal in portal; Owner marks as "Converted" in admin.

## 10. Owner/Admin Flows
- Setting "Priority" (High/Med/Low) on requests to triage auction bidding.
- Linking a proposal to a newly created `Vehicle` record once it arrives at the dealership.

## 11. States and Transitions
- Request: `Submitted → Under Review → Sourcing → Vehicle Proposed → Customer Approved → Converted`.
- Proposal: `Proposed → Customer Accepted | Declined | Expired`.

## 12. UI Surfaces
- `/request-vehicle` (Form)
- `/admin/requests` (List + Detail)
- `/portal/requests/[id]` (Customer View + Accept/Decline)
- `ProposalModal` (Admin creation)

## 13. API / Backend Responsibilities
- Proposal photo storage.
- Request-to-Customer linkage (identity resolution).
- Status transition logic (Accepting a proposal updates the parent Request).
- Conversion logic (Stub deal creation).

## 14. Security / Audit Requirements
- Strictly `/portal` and `/admin` protection.
- Audit Logging: `request.submitted`, `proposal.created`, `proposal.accepted`, `request.converted`.

## 15. Acceptance Criteria
- [ ] Customer can submit a sourcing request with all required fields (Test REQ-001).
- [ ] Owner can create a proposal with vehicle details (Test REQ-004).
- [ ] Customer can view and "Accept" a proposal in their portal (Test REQ-005).
- [ ] "Accept" updates both proposal and request statuses correctly (Test REQ-005).
- [ ] Converted requests are linked to a new Deal record (Test REQ-006).

## 16. Edge Cases / Failure Cases
- **Expired Proposals:** Owner can mark a proposal as "Expired" if the auction vehicle is sold to someone else.
- **Multiple Proposals:** A single request can have multiple proposals; accepting one declines or ignores the others.

## 17. Dependencies on Other Epics
- `Epic 03` (Customer Portal shell).
- `Epic 01` (Foundation).

## 18. Deferred Items / Notes
- Automated notifications (email/SMS) for new proposals.
- Direct DocuSign link for sourcing deposit (MVP uses manual deal conversion).
