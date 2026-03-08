Title: Task 08.03 - Stripe Webhook Listener (Succeeded)
Purpose: Automate the deal and vehicle status updates upon successful payment.
Files likely touched: src/app/api/stripe/webhook/route.ts, src/lib/actions/payment.ts
Implementation steps:
1. Implement an API route `src/app/api/stripe/webhook/route.ts` that verifies the Stripe signature.
2. Listen for the `payment_intent.succeeded` event.
3. Update `DealDeposit.paymentStatus = SUCCEEDED`, `Deal.dealStatus = Deposit Received`, and `Vehicle.vehicleStatus = Reserved`.
4. Implement idempotent handling to prevent duplicate updates (Doc 11, 9.2).
Acceptance criteria:
- Payment success updates all records atomically in the database (Test XSY-002).
- Webhook signature is verified correctly.
- Webhook handles retries gracefully.
Dependencies: Task 08.02, Task 01.02
Related epic: 08 — Stripe Deposit Payments
Related acceptance tests: XSY-002, DEP-001
