Title: Task 11.01 - Audit Event Coverage (Global Activity)
Purpose: Ensure all significant user and system actions are logged in the database.
Files likely touched: src/lib/audit.ts, all server actions
Implementation steps:
1. Finalize the `logEvent` helper in `src/lib/audit.ts` to capture timestamps, actors, and metadata (Doc 11, 8).
2. Ensure every state-changing server action (Inquiries, Deals, Inventory, etc.) includes a call to `logEvent`.
3. Create an admin view `/admin/audit-logs` that displays a chronological list of all events.
Acceptance criteria:
- Audit logs exist for all events listed in Canon 11 (Test XSY-004).
- The admin activity log correctly displays the event history.
Dependencies: Task 01.01, all feature epics
Related epic: 11 — Security Hardening and Audit
Related acceptance tests: XSY-004
