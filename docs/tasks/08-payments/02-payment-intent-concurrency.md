Title: Task 08.02 - Stripe PaymentIntent and Concurrency Check
Purpose: Ensure a vehicle is available before initiating a payment.
Files likely touched: src/lib/actions/payment.ts, src/app/api/stripe/intent/route.ts
Implementation steps:
1. Create an API route or server action to handle Stripe `PaymentIntent` creation.
2. Implement a server-side status check: only create the intent if `Vehicle.vehicleStatus = LISTED` (Doc 11, 9.3).
3. Return the client secret to the frontend.
Acceptance criteria:
- `PaymentIntent` is created only if the vehicle is currently "Listed" (Test DEP-003).
- Concurrent reservation attempt shows an error to the second customer (Doc 11, 9.3).
Dependencies: Task 08.01, Task 01.02
Related epic: 08 — Stripe Deposit Payments
Related acceptance tests: DEP-003
