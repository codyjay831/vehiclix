# Evo Motors Deals: Data Model Evolution

## Current Schema (Summary)
The current `Deal` model in `prisma/schema.prisma` is minimal:
- `id`: UUID.
- `vehicleId`: Relation to `Vehicle`.
- `userId`: Relation to `User`.
- `dealStatus`: Enum `DealStatus`.
- `purchasePrice`: Decimal.
- `depositAmount`: Decimal.
- `createdAt`, `updatedAt`, `organizationId`.
- Relations: `deposits`, `documents`, `envelopes`, `energyRequests`.

## Phase 1A: Minimal Functional Addition
To support the guided flow and pricing snapshot, we must add these fields to the `Deal` model:

### 1. Payment Path & Source Info
- `paymentPath`: Enum `[CASH, OUTSIDE_FINANCE, DEALER_FINANCE]`.
- `sourceChannel`: String (e.g., "WALK_IN", "WEBSITE", "FACEBOOK").
- `dealOwnerId`: Relation to `User` (Salesperson).

### 2. Commercial Snapshot
- `sellingPriceSnapshot`: Decimal (The negotiated list price).
- `dealerFeeSnapshot`: Decimal (Standard doc/prep fees).
- `taxAmountSnapshot`: Decimal (Estimated taxes).
- `registrationFeeSnapshot`: Decimal (DMV/Title fees).
- `totalAmountDue`: Decimal (Calculated total).
- `depositRequired`: Decimal (Snapshot of the required deposit at time of deal start).

### 3. Primary Buyer Relationship
Phase 1 should prefer reuse of the existing `Deal.userId` relationship for the primary buyer if repo inspection confirms it is safe to do so. Avoid renaming this field during the first implementation pass unless the change is proven trivial and low-risk. Richer buyer-role normalization (for example `buyerId`, `coBuyerId`, or `DealCustomerRole`) belongs to a later intentional schema evolution phase.

### 4. Organization Policy (Metadata)
- `Organization.tenderPolicy`: Json (Store-wide settings for credit card caps, ACH clearing requirements, etc.).

## Phase 1B: Metadata & Verification
We leverage JSON fields to track branching detail and operational exceptions.

### 5. Checklist, Stips & Funding
- `checklistItems`: Json (Array of `{id, milestone, status, verifiedAt, verifiedBy, isOverride, overrideReason}`).
- `lenderInfo`: Json (For financing: `{lenderName, loanAmount, contactInfo, fundingStatus}`).
- `paymentHistory`: Json (Snapshot of verified payments vs. pending transfers for split-tender tracking).
- `vehicleHistory`: Json (Log of VINs attached to this deal if a swap occurs).

## Phase 2: Fully Relational Architecture
Once requirements stabilize, we normalize the metadata into structured models:

### 6. Proposed New Models (Phase 2)
- **`DealCustomerRole`**: Support multiple buyers (Buyer, Co-buyer, Business Signer).
- **`DealTradeIn`**: Relational model for trade VIN, payoff lender, and equity.
- **`DealAssetAssignment`**: Tracks the history of vehicles attached to the deal.
- **`DealChecklistItem`**: Granular task and milestone tracking with audit fields.
- **`DealStipulation`**: Specific model for POI/POR document verification.
- **`DealFunding`**: Relational tracking of individual payments/transfers toward the final balance.

## Migration Rationale
- **Avoid Schema Explosion**: Phase 1A should focus on fields that directly affect the UI wizard.
- **JSON for Flexibility**: Use JSON for checklist and lender info until the requirements are fully stabilized.
- **Maintain Invariants**: Ensure `one-active-deal-per-vehicle` logic is enforced in the service layer, but consider a database-level partial unique index in Phase 2.

## What Not To Add Yet
- **Lender Table**: Do not create a global "Lenders" table yet; keep it as a free-text field or simple JSON for now.
- **Payment Gateway Links**: Do not add Stripe-specific fields to the Deal model; keep them in the `DealDeposit` model where they are now.
- **Complex Inventory Logic**: Avoid adding "Deal" fields to the `Vehicle` model. Keep the directionality: Deal -> Vehicle.
