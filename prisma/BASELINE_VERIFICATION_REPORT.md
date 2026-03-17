# Baseline schema verification report

**Date:** Verification run via `npx tsx prisma/scripts/verify_baseline.ts`  
**Purpose:** Confirm DB contains baseline schema before running `prisma migrate resolve --applied "20260315000000_init_baseline"`.

---

## A. Baseline objects expected

From `prisma/migrations/20260315000000_init_baseline/migration.sql`:

**Enums (26):**  
DomainStatus, Role, BetaAccessStatus, InviteStatus, VehicleStatus, Drivetrain, InventoryCondition, TradeInCondition, TitleStatus, MediaType, InquiryStatus, VehicleRequestStatus, ProposalStatus, DealStatus, PaymentStatus, DocumentStatus, EnvelopeStatus, ContactMethod, EnergyServiceType, EnergyServiceStatus, Priority, LeadStatus, LeadSource, LeadActivityType, SubscriptionStatus, PlanKey.

**Tables (24):**  
Organization, OrganizationHomepage, OrganizationBranding, OrganizationDomain, User, Vehicle, VehicleMedia, VehicleDocument, VehicleInquiry, TradeInCapture, VehicleRequest, VehicleProposal, Deal, DealDeposit, DealDocument, DocuSignEnvelope, EnergyServiceRequest, EnergyServiceStatusHistory, ActivityEvent, BetaAccessRequest, OwnerInvite, Lead, LeadActivity, OrganizationSubscription.

---

## B. Objects found in the current DB

| Baseline object type | Expected | Found in DB | Status |
|----------------------|----------|-------------|--------|
| **Tables**           | 24       | 24          | All present (+ `_prisma_migrations`) |
| **Enums**            | 26       | 26          | All present (+ `OrganizationStatus` from a later migration) |
| **Vehicle Phase 2 columns** (bodyStyle, fuelType, transmission, doors) | — | Missing | Will be added by deploy |
| **Vehicle EV columns** (batteryCapacityKWh, batteryChemistry, chargingStandard) | — | Missing | Will be added by deploy |

All 24 baseline tables and 26 baseline enums exist in the database. No missing tables or enums.

---

## C. Safety verdict

**SAFE** to run `prisma migrate resolve --applied "20260315000000_init_baseline"`.

The database already contains the full baseline schema (tables and enums). Phase 2 and EV columns on `Vehicle` are correctly absent and will be added by the pending migrations when you run `prisma migrate deploy`.

---

## D. Next command plan

Run these in order:

```powershell
cd "c:\Users\Codyj\Projects\Evo Motors"
npx prisma migrate resolve --applied "20260315000000_init_baseline"
npx prisma migrate deploy
npx prisma generate
```

Then verify:

```powershell
npx prisma migrate status
```

---

## Verification script

Read-only verification was performed by:

- `prisma/scripts/verify_baseline.ts` — queries `pg_tables`, `pg_type`/`pg_enum`, and `information_schema.columns` for `Vehicle`. No schema or data was modified.

To re-run:

```powershell
npx tsx prisma/scripts/verify_baseline.ts
```
