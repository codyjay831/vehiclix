Title: Task 10.03 - Admin Lead Status Management
Purpose: Track the handoff progress of energy leads to Baytech.
Files likely touched: src/app/admin/baytech/page.tsx, src/lib/actions/energy.ts
Implementation steps:
1. Implement status update actions in `src/lib/actions/energy.ts` (Submitted → Acknowledged → ... → Closed).
2. Add a manual status update to the admin energy lead view.
3. Ensure no complex scheduling or contractor features are added, as per canon.
Acceptance criteria:
- Owner can manually update the handoff status of energy leads.
- Status changes are reflected in the customer portal.
Dependencies: Task 10.02
Related epic: 10 — Baytech Energy Service Handoff
Related acceptance tests: None
