# Evo Motors Deals: Payment and Branching Rules

This document defines the operational logic for tender handling, financing branches, and transaction exceptions.

## 1. Tender and Payment Policy

The system distinguishes between **Reservation Deposits** (to secure the vehicle) and **Final Payment** (to close the deal).

### Store-Configurable Policy
- Dealers define allowed tender types per transaction type (Deposit vs. Final).
- **Credit Cards**: Usually restricted to small deposits (e.g., max $500–$2,500). Surcharges and reconciliation rules apply.
- **ACH/Bank Transfer**: Requires verification of cleared funds before vehicle release.
- **Cashier's Check**: Requires Manager Approval at the Release Gate to verify authenticity.
- **Verified Personal Check**: Only allowed if dealer policy specifically permits (often requires 3rd party verification like TeleCheck).
- **Wire/Cash**: Standard but require manual "Mark as Received" by authorized staff.

### Split Tender Support
- A single deal may involve multiple payment methods (e.g., $500 Credit Card Deposit + $10,000 ACH + $5,000 Outside Finance).
- The system tracks a `balanceRemaining` based on the snapshotted total vs. sum of verified payments.

## 2. Outside Financing Branch
When a buyer brings their own financing (Bank/Credit Union):

- **Required Metadata**: Lender Name, Loan Officer Contact, Pre-approval Amount.
- **Milestones**:
    - [ ] Approval Letter Uploaded.
    - [ ] Lender Instructions Received (Title/Lienholder info).
    - [ ] Funding Status: `AWAITING_DOCS` -> `AWAITING_FUNDING` -> `FUNDED`.
- **Release Gate**: Typically requires proof of funding or a "Letter of Guarantee" from the lender.

## 3. Dealer-Arranged Financing Branch
When the dealer arranges the loan through their network:

- **Milestones**:
    - [ ] Credit Application Submitted (Internal or External link).
    - [ ] Lender Response: `APPROVED`, `COUNTERED`, or `DECLINED`.
    - [ ] Stipulation Collection: Proof of Income (POI), Proof of Residence (POR), Insurance.
    - [ ] Contract Ready & Signed.
    - [ ] Funding Lifecycle: `SENT_TO_LENDER` -> `FUNDED`.

## 4. Business Buyer Path
- **Signer**: Requires identifying the authorized representative (e.g., CEO, Manager) vs. the Entity (LLC, Corp).
- **Docs**: Requires Articles of Incorporation or Corporate Resolution for significant purchases.
- **Status**: Phase 2 (Minimal support in Phase 1 via "Note" or custom checklist item).

## 5. Vehicle Swap Handling
- **Operational Reality**: Customers may switch cars after a deal starts but before delivery.
- **Rule**: The Deal is the parent; the `vehicleId` is swapped.
- **Impacts**: 
    - Previous vehicle is released back to `LISTED`.
    - New vehicle is locked to the deal.
    - Terms (Price/Fees) must be re-snapshotted and confirmed.
    - Checklist must recompute (e.g., if new car has different tax rules or registration requirements).
- **Status**: Phase 2.

## 6. Document Governance
- **Authoritative Copies**: Signed contracts (e-sign or wet-sign) are treated as secure, immutable records.
- **Wet-Sign Exceptions**: If digital signature is not possible, staff must upload a "Wet-Sign Affidavit" and the scanned contract.
- **Access Control**: Only Owners and authorized Staff/Managers can view sensitive financial documents (Credit Apps, POI).

## 7. Manager Overrides
- **Gates**: Certain milestones (e.g., "Funds Cleared") can be overridden by a Manager.
- **Audit Trail**: Every override requires a mandatory `Reason Code` and is logged in the `ActivityEvent` table.
- **Anti-Abuse**: Overrides do not bypass the legal requirement for a signed contract; they only bypass the *system check* for status.

## 8. Handoff and Finalization
- **Physical Handoff**: Marks the deal as `DELIVERED` and the vehicle as **`SOLD`**.
- **Post-Handoff Tracking**: For finance deals, the deal remains open until funds are received from the lender, at which point it is marked `COMPLETED`.
