Title: Task 05.02 - Inquiry Status Management
Purpose: Track the owner's progress with each inquiry via status updates and notes.
Files likely touched: src/app/admin/inquiries/[id]/page.tsx, src/lib/actions/inquiry.ts
Implementation steps:
1. Implement status update actions in `src/lib/actions/inquiry.ts` (New → Reviewed → Responded → Closed).
2. Add a threaded internal notes area to the inquiry detail page (Doc 10, Scenario D).
3. Ensure status updates and notes are logged in the activity timeline.
Acceptance criteria:
- Owner can mark an inquiry as "Reviewed" and "Responded" (Test INQ-004).
- Internal notes save correctly and are visible only to the owner.
Dependencies: Task 05.01
Related epic: 05 — Inquiries, Trade-Ins, and Financing Interest
Related acceptance tests: INQ-004
