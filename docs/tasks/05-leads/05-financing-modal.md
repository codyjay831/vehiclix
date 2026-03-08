Title: Task 05.05 - Financing Interest Modal
Purpose: Capture lightweight financing intent from customers on the VDP.
Files likely touched: src/components/FinancingModal.tsx, src/lib/actions/inquiry.ts
Implementation steps:
1. Create `FinancingModal.tsx` capturing name, email, phone, and estimated credit range (Doc 10, Scenario Q).
2. Implement a server action to flag financing interest on a new or existing inquiry.
3. Ensure no sensitive PII (SSN, DOB) is collected, as per canon.
Acceptance criteria:
- Financing intent is captured and visible to the owner (Test TRD-002).
- No sensitive financial data is stored.
Dependencies: Task 02.04, Task 01.02
Related epic: 05 — Inquiries, Trade-Ins, and Financing Interest
Related acceptance tests: TRD-002
