Title: Task 08.01 - Reservation Page with Stripe Elements
Purpose: Implement the secure payment form for customer deposits.
Files likely touched: src/app/inventory/[slug]/reserve/page.tsx, src/components/StripeForm.tsx
Implementation steps:
1. Create `src/app/inventory/[slug]/reserve/page.tsx` with a vehicle summary and a deposit form (Doc 10, Scenario M).
2. Integrate `StripeForm.tsx` using `@stripe/react-stripe-js` and `loadStripe`.
3. Add the agreement checkbox and basic customer info fields.
Acceptance criteria:
- Reservation page renders with a working Stripe Elements payment form (Test DEP-001).
- Customer information fields validate correctly.
Dependencies: Task 02.04, Task 01.01
Related epic: 08 — Stripe Deposit Payments
Related acceptance tests: DEP-001
