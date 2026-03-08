# 08 — Stripe Deposit Payments

## 1. Epic Title
Reservation Deposits with Stripe Integration

## 2. Purpose
Implement the secure payment flow for reservation deposits, ensuring that a vehicle is correctly "locked" and a deal is initiated only upon successful payment.

## 3. User / Business Value
Provides immediate financial commitment from the buyer. Automates the reservation process, allowing the dealer to hold inventory with confidence and without manual invoice generation.

## 4. Canon Dependencies
- `docs/canon/01` (Deposit Rules)
- `docs/canon/05` (Payments Domain)
- `docs/canon/10` (Scenario M)
- `docs/canon/11` (Payment Mapping)
- `docs/canon/12` (DEP Tests)

## 5. In Scope
- **Reservation Page (`/inventory/[slug]/reserve`):**
  - Integrated Stripe Elements payment form (Scenario M).
  - Agreement checkbox for refundable deposit terms.
  - Form validation (Name, Email, Phone).
- **Backend Payment Flow:**
  - Stripe PaymentIntent creation.
  - Concurrency check (Is vehicle still `Listed`?).
  - Webhook listener for `payment_intent.succeeded`.
- **Post-Payment:**
  - Automatic Deal creation (status: `Deposit Received`).
  - Automatic Vehicle update (status: `Reserved`).
  - Redirect to success page with confirmation details.
- **Refund Interface:** Owner-only manual refund button (triggers Stripe API).

## 6. Out of Scope
- Full vehicle purchase payment (balance is manual).
- Monthly payment calculator.
- Stripe Connect for multi-dealer (solo dealer only).

## 7. Actors
- Customer
- Owner (for refunds)
- System (Stripe Webhook)

## 8. Core Entities Touched
- `DealDeposit`
- `Deal`
- `Vehicle`
- `ActivityEvent`

## 9. Main User Flows
- **Reservation:** Customer pays $500 on a Tesla Model 3; vehicle is immediately hidden from others (Scenario M).
- **Webhook Handling:** Stripe confirms success; deal status updates automatically while customer is being redirected.

## 10. Owner/Admin Flows
- Viewing deposit details (transaction ID, date) in the deal detail view.
- Issuing a refund if a customer backs out before signing contracts.

## 11. States and Transitions
- `DealDeposit`: `PENDING → SUCCEEDED | FAILED | REFUNDED`.
- `Deal`: `Lead/Deposit Pending → Deposit Received`.
- `Vehicle`: `Listed → Reserved`.

## 12. UI Surfaces
- `/inventory/[slug]/reserve` (Payment Form)
- `/reservation/[id]/confirmation` (Success Page)
- `/admin/deals/[id]` (Refund button)

## 13. API / Backend Responsibilities
- Idempotent webhook handler (Doc 11, 9.2).
- Concurrency protection: Check `Vehicle.status` before creating `PaymentIntent`.
- Secure Stripe secret handling.
- Calculation logic: Deposit amount (global setting vs per-vehicle).

## 14. Security / Audit Requirements
- Webhook signature verification mandatory.
- No client-side reliance for status updates (Doc 07, 7).
- Audit Logging: `deposit.initiated`, `deposit.completed`, `vehicle.reserved`.
- No sensitive card data stored in local DB.

## 15. Acceptance Criteria
- [ ] Stripe Elements renders correctly on the reserve page (Test DEP-001).
- [ ] Payment success updates Deal and Vehicle status atomically (Test XSY-002).
- [ ] Vehicle status check prevents double-reservation (Test DEP-003).
- [ ] Card declines show inline error messages (Test DEP-004).
- [ ] Webhook handler retries on transient DB errors.

## 16. Edge Cases / Failure Cases
- **Race Condition:** Two users click reserve at once. Second user gets error before payment form loads (Doc 11, 9.3).
- **Abandoned Checkout:** `PaymentIntent` expires; `Deal` stays in `Deposit Pending` (Owner can clean up).
- **Stripe Down:** Graceful error message: "Payment service is temporarily unavailable."

## 17. Dependencies on Other Epics
- `Epic 07` (Deal Lifecycle).
- `Epic 01` (Foundation).
- `Epic 02` (VDP CTAs).

## 18. Deferred Items / Notes
- Partial deposit refunds.
- Alternative payment methods (Apple Pay / Google Pay).
