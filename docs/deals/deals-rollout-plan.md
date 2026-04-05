# Evo Motors Deals: Implementation & Rollout Plan

## Overview
The new Deals system will be rolled out in three phases to minimize disruption to existing operations and ensure that each piece of the guided flow is validated by staff.

## Phase 1A: The Guided Foundation
**Goal**: Implement the creation wizard and minimal additions to the existing deal detail page.

- **Primary Tasks**:
  - Update Prisma schema: Add `paymentPath`, `sellingPriceSnapshot`, `dealerFeeSnapshot`, `taxAmountSnapshot`, `registrationFeeSnapshot`, `dealOwnerId` to the `Deal` model.
  - Create the `CreateDealWizard` component (Multi-step form).
  - Add "Start Deal" buttons to `admin/inventory/[id]` and `admin/leads/[id]`.
  - Update `getAdminDealDetail` and the existing deal detail page with minimal UI additions to display snapshotted terms.
  - **Soft Lock**: Implement `DRAFT` as an internal soft-lock; it does NOT remove the vehicle from public inventory.
- **Migration Risk**: Low. New fields are nullable or have defaults.
- **UI Risk**: Low. Reuses existing surfaces with additive UI elements.
- **Success Look-like**: Staff can start a deal from an inventory record and see the negotiated price locked in the current deal detail view.

---

## Phase 1B: Branching & Gating
**Goal**: Implement the dynamic checklist, branching logic, and the "Clear to Release" gate.

- **Primary Tasks**:
  - Implement a `useDealChecklist` hook that generates tasks based on the `paymentPath`.
  - Create the `DealChecklist` UI component as an addition to the deal detail page.
  - Implement **Manager Overrides** with reason logging.
  - Implement **Outside Finance** and **Dealer Finance** manual milestones.
  - Add the `Release for Delivery` and `Complete Delivery` server actions.
  - Basic **Tender Policy** distinction (Deposit vs. Final).
  - Update `VehicleStatus` transitions: `RESERVED` -> `UNDER_CONTRACT` -> `SOLD` (at delivery).
- **Validation**: Test each branch (Cash vs Finance) to ensure the correct tasks appear and block delivery.
- **Success Look-like**: A vehicle cannot be marked `SOLD` until the checklist is 100% complete and the delivery step is finalized.

---

## Phase 2: Transaction Expansion
**Goal**: Enable customer self-service and handle more complex deal structures.

- **Primary Tasks**:
  - Create a new public route: `/[dealerSlug]/deals/[secureToken]`.
  - Build the mobile-first **Customer Task Portal** (uploads, basic info).
  - Implement **Vehicle Swap** auditable flow.
  - Support **Co-buyer** and **Business Buyer** roles.
  - Implement the **Trade-In** model and sub-flow.
  - Post-delivery **Funding Lifecycle** tracking.
- **Rollout Advice**: Pilot with a single salesperson before opening the portal to all customers.

---

## Phase 3: Automation & Integrations
**Goal**: Deeply integrate with external systems for a "One-Click" transaction experience.

- **Primary Tasks**:
  - **Lender Integrations**: Direct credit routing and instant decisions.
  - **Payment Rails**: Automated ACH/Wire reconciliation.
  - **E-Sign Automation**: Dynamic DocuSign template mapping.
  - **KYC/Identity**: Automated DL and ID verification.
  - **Trade Appraisal**: Integration with external valuation APIs.

---

## Production Safety & Rollback
- **Safety**: Use Prisma transactions for all status updates involving both `Deal` and `Vehicle` to avoid state desync.
- **Rollback**: If the new wizard fails, the old `CreateDeal` action should remain available as a fallback until Phase 1A is stabilized.
- **Monitoring**: Log all "Deal Started" and "Delivery Gate Passed" events in the `ActivityEvent` table for auditability.

## Recommended Files Likely to Change
- `prisma/schema.prisma`: New fields and relations.
- `src/lib/deal.ts`: Update fetch logic for snapshots.
- `src/actions/deal.ts`: New actions for creation, status gating, and snapshots.
- `src/app/(admin)/admin/deals/[id]/page.tsx`: Major UI overhaul.
- `src/app/(admin)/admin/inventory/[id]/page.tsx`: Add "Start Deal" entry point.
- `src/components/admin/CreateDealWizard.tsx`: New component.
- `src/components/admin/DealChecklist.tsx`: New component.
