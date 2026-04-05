# Evo Motors Deals: Epics Breakdown

## Epic 1: Phase 1A - Guided Deal Creation
**Objective**: Replace the current linear "Create Deal" form with a multi-step guided wizard for Admin users.

- **User Value**: Staff can easily start a transaction from any context without manual data entry.
- **Business Value**: Faster deal initiation and reduced errors in customer/vehicle linking.
- **Scope**:
  - New "Start Deal" entry points on Vehicle Detail and Lead/Inquiry pages.
  - Multi-step wizard:
    1. **Customer Selection**: Search existing users or create a new "Stub" buyer.
    2. **Vehicle Confirmation**: Display vehicle info and confirm linking.
    3. **Commercial Snapshot**: Record the Negotiated Price, Fees, and Taxes at the time of creation.
    4. **Payment Path Selection**: Choose initial path (Cash, Outside Finance, Dealer Finance).
  - Save as `DRAFT` or `DEPOSIT_PENDING`.
- **Out of Scope**: Trade-in sub-flows, customer-facing portal, actual payment processing.
- **Acceptance Criteria**:
  - Staff can start a deal from a vehicle page with one click.
  - Price is snapshotted and persists even if vehicle price changes.
  - `DRAFT` status provides an internal soft-lock only.
  - Deal lands in the existing detail page with minimal UI additions.

---

## Epic 2: Phase 1B - Branch-Aware Deal Management
**Objective**: Evolve the Deal Detail page into a "Deal Jacket" that adapts to the selected payment path.

- **User Value**: Staff see only the tasks relevant to the current deal's financing path.
- **Business Value**: Standardized compliance and faster "Time to Fund".
- **Scope**:
  - **Dynamic Checklist**: Show different required milestones based on `paymentPath`.
  - **Branch Logic**:
    - **Cash**: Verification of funds step.
    - **Outside Finance**: Lender info + Approval Letter upload.
    - **Dealer Finance**: Credit app status + Stipulation tracking.
  - **Delivery Readiness Gate**: A "Release Vehicle" button that is only enabled when all branch-specific milestones are complete.
- **Acceptance Criteria**:
  - Switching from Cash to Finance updates the required doc list instantly.
  - Vehicle cannot be marked `SOLD` without the "Clear to Release" gate and final handoff.

---

## Epic 3: Vehicle Locking & Conflict Prevention
**Objective**: Ensure data integrity and prevent double-dealing of the same asset.

- **User Value**: Prevents selling the same car twice.
- **Business Value**: Inventory accuracy and trust.
- **Scope**:
  - **Active Deal Guardrails**: Prevent starting a new deal if an active one exists for that VIN.
  - **Inventory UI Visibility**: Show "In Deal" badge on inventory rows.
  - **Cleanup Logic**: Auto-release vehicle back to `LISTED` if a Deal is `CANCELLED`.
- **Acceptance Criteria**:
  - Attempting to start a deal on a "Reserved" or "Under Contract" vehicle throws a clear error.
  - Vehicle status automatically transitions based on Deal milestones.

---

## Epic 4: Commercial Snapshot & Deal Terms
**Objective**: Protect the transaction from external price drift and track gross profit.

- **User Value**: Guaranteed pricing for the buyer.
- **Business Value**: Accurate accounting and profit tracking.
- **Scope**:
  - **Price Snapshot Fields**: Add `negotiatedPrice`, `docFee`, `taxAmount`, `registrationFee` to the Deal model.
  - **Deposit Handling**: Separate "Deposit Paid" from "Total Final Payment".
- **Acceptance Criteria**:
  - Changing the Vehicle price in the Inventory editor does not change the Price on an existing Deal.

---

## Epic 5: Customer & Vehicle Expansion (Phase 2+)
**Objective**: Build out advanced transaction scenarios and customer portal.

- **Scope**:
  - **Co-Buyer & Business Buyers**: Link multiple users or entities to a single deal.
  - **Trade-In Sub-flow**: Capture trade-in VIN, mileage, payoff, and equity.
  - **Vehicle Swap**: Support auditable swapping of the attached asset mid-deal.
  - **Customer Portal**: Secure link for buyers to upload IDs/Insurance and sign contracts.
- **Out of Scope for Phase 1**: All items in this Epic are deferred to Phase 2.

---

## Epic 6: Operational Compliance & Exceptions (Phase 1B+)
**Objective**: Implement tender policies, manager overrides, and post-delivery funding logic.

- **Scope**:
  - **Tender Policy**: Store-configurable rules for Cash/Card/ACH/Wire.
  - **Manager Overrides**: Auditable gate bypasses with reason logging.
  - **Funding Lifecycle**: Post-delivery tracking (`READY_FOR_FUNDING` -> `FUNDED`).
  - **Document Governance**: Treating signed contracts as authoritative legal records.
  - **Audit Logs**: Enhanced tracking for all commercial and status overrides.
- **Phase Ownership**: Basic tender distinction in 1A; Overrides and Funding Lifecycle in 1B.
