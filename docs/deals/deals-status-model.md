# Evo Motors Deals: Status & State Model

## Overview
Evo Motors uses two status fields to track a transaction: `DealStatus` (the process) and `VehicleStatus` (the asset). These must be kept in sync through a centralized state engine.

## Current `DealStatus` (Enum-based)
- `LEAD`: Initial interest.
- `DEPOSIT_PENDING`: Waiting for reservation payment.
- `DEPOSIT_RECEIVED`: Reservation secured.
- `DOCUMENTS_PENDING`: Collecting buyer info.
- `CONTRACTS_SENT`: DocuSign envelope active.
- `CONTRACTS_SIGNED`: All signatures verified.
- `READY_FOR_DELIVERY`: All gates passed; release authorized.
- `DELIVERED`: Vehicle handed over; marks vehicle as **`SOLD`**.
- `COMPLETED`: Finalized; funded, docs filed, title processing.
- `CANCELLED`: Deal aborted.

*Note: Phase 1A will use existing statuses where possible. `DELIVERED` will be added to the enum in Phase 1B to distinguish handoff from finalization.*

## Proposed Sub-Statuses (Metadata-based)
To handle branching, we should move toward a **Milestone Completion** model for Phase 1B, rather than a single linear status enum.

### 1. Active Deal Definition
A Deal is considered "Active" if its status is NOT `COMPLETED` or `CANCELLED`.
- **Constraint**: Only one Active Deal is permitted per `vehicleId`.

### 2. Payment Path Branching (`paymentPath` field)
A new field on the `Deal` model:
- `CASH`: Minimal docs, focus on funds verification.
- `OUTSIDE_FINANCE`: Focus on lender communication.
- `DEALER_FINANCE`: Focus on credit app and stipulations.

### 3. State Transition Rules

| Event | Deal Status | Vehicle Status | Note |
|-------|-------------|----------------|------|
| **Start Deal** | `DRAFT` | `RESERVED` | Internal soft lock (warning only). |
| **Commitment** | `DEPOSIT_PENDING` | `RESERVED` | Public reservation; 24h timer. |
| **Deposit Paid** | `DEPOSIT_RECEIVED` | `UNDER_CONTRACT` | Hard lock; vehicle removed from site. |
| **Contracting** | `CONTRACTS_SENT` | `UNDER_CONTRACT` | DocuSign envelope active. |
| **Signed** | `CONTRACTS_SIGNED` | `UNDER_CONTRACT` | All signatures verified. |
| **Released** | `READY_FOR_DELIVERY` | `UNDER_CONTRACT` | Gating milestones all met (Release Ready). |
| **Handoff** | `DELIVERED` | `SOLD` | Physical delivery; vehicle becomes SOLD. |
| **Finalized** | `COMPLETED` | `SOLD` | Funded, docs filed, title processing. |
| **Deal Cancelled**| `CANCELLED` | `LISTED` | Asset released back to inventory. |

## Funding & Follow-up Sub-Statuses
After delivery (`SOLD`), the deal tracks financial completion:
- **`WAITING_FOR_FUNDING`**: (Finance deals) Signed contract sent to lender.
- **`FUNDED`**: Money received in dealership account.
- **`TITLE_PENDING` / `TITLE_FILED`**: Post-sale DMV processing.

## Delivery Readiness Gating (The "Clear to Release" Logic)
The "Release for Delivery" action should only be enabled when all path-specific criteria are met:

### **Common Criteria**
- [ ] Primary Buyer Attached
- [ ] Valid ID Uploaded & Verified
- [ ] Valid Insurance Uploaded & Verified
- [ ] Negotiated Price & Terms Snapshotted
- [ ] All Contracts Signed (DocuSign status: COMPLETED)

### **Path-Specific Criteria**
- **CASH**:
  - [ ] Deposit Verified
  - [ ] Final Balance Verified (or ACH cleared)
- **OUTSIDE_FINANCE**:
  - [ ] Lender Name & Contact Recorded
  - [ ] Lender Approval Letter Uploaded
  - [ ] Funding Confirmation (Lender check or wire)
- **DEALER_FINANCE**:
  - [ ] Credit Application Approved
  - [ ] All Lender Stipulations (POI/POR) Verified
  - [ ] Contract Assigned to Lender

## Implementation Anti-Drift Rules
1. **Centralized Service**: All status updates must go through a single `updateDealStatus` service (server action) to ensure `VehicleStatus` is updated in the same transaction.
2. **Re-validation**: Changing the `paymentPath` must trigger a re-validation of the `READY_FOR_DELIVERY` state.
3. **No Skip-Ahead**: Transitions should generally follow the defined sequence, though "Draft" to "Deposit" can be skipped for cash-in-hand buyers.
