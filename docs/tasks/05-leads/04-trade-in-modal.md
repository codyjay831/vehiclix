Title: Task 05.04 - Trade-In Capture Modal
Purpose: Capture lightweight trade-in details from customers on the VDP.
Files likely touched: src/components/TradeInModal.tsx, src/lib/actions/trade-in.ts
Implementation steps:
1. Create `TradeInModal.tsx` with year/make/model, mileage, condition, and optional photos (Doc 10, Scenario P).
2. Implement a server action `submitTradeIn` that creates a `TradeInCapture` record.
3. Link the trade-in to the current vehicle context and the customer email.
Acceptance criteria:
- Trade-in details are captured and stored in the database (Test TRD-001).
- Success message appears correctly in the modal.
- No automated valuation is provided, as per canon.
Dependencies: Task 02.04, Task 01.02
Related epic: 05 — Inquiries, Trade-Ins, and Financing Interest
Related acceptance tests: TRD-001
