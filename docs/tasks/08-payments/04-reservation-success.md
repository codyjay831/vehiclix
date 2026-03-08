Title: Task 08.04 - Reservation Success Page
Purpose: Provide a confirmation to the customer after their deposit is confirmed.
Files likely touched: src/app/reservation/[id]/confirmation/page.tsx
Implementation steps:
1. Create `src/app/reservation/[id]/confirmation/page.tsx` with a summary of the reservation (Doc 10, Scenario M).
2. Display the vehicle info, deposit amount, and confirmation reference.
3. Include a "Create Your Account" CTA for new customers (Doc 10, Scenario M).
Acceptance criteria:
- Success page shows all correct reservation details (Test DEP-005).
- "Create Your Account" button is present and links correctly.
Dependencies: Task 08.03
Related epic: 08 — Stripe Deposit Payments
Related acceptance tests: DEP-005, DEP-001
