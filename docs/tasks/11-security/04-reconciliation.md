Title: Task 11.04 - Transactional Reconciliation Job
Purpose: Maintain data consistency between Stripe/DocuSign and the database.
Files likely touched: src/app/api/reconcile/route.ts, src/lib/reconciliation.ts
Implementation steps:
1. Create a server-side reconciliation job in `src/lib/reconciliation.ts`.
2. Implement checks: e.g., `DealDeposit` with `SUCCEEDED` status but `Deal` status not `Deposit Received`.
3. Create a protected API route `/api/reconcile` that can be triggered by a cron job or manually.
Acceptance criteria:
- Reconciliation job correctly identifies and fixes status desyncs (Test XSY-002 context).
- System-wide data integrity is maintained through periodic checks.
Dependencies: Task 08.03, Task 09.05, Task 11.01
Related epic: 11 — Security Hardening and Audit
Related acceptance tests: XSY-002 (as reconciliation target)
