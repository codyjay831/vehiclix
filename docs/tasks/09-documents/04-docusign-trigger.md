Title: Task 09.04 - DocuSign Envelope Creation (Admin)
Purpose: Allow the owner to initiate a legally binding contract signature process.
Files likely touched: src/app/admin/deals/[id]/page.tsx, src/lib/actions/docusign.ts
Implementation steps:
1. Integrate the DocuSign API and configure the required templates.
2. Add a "Send Contracts" button to the admin deal detail page (Epic 09, 5).
3. Implement a server action to create a `DocuSignEnvelope` record with status `SENT`.
4. Update the parent `Deal` status to `Contracts Sent`.
Acceptance criteria:
- Owner can trigger a DocuSign envelope creation for the purchase agreement.
- `DocuSignEnvelope` and `Deal` records update correctly.
Dependencies: Task 07.01, Task 01.02
Related epic: 09 — Documents, Uploads, and DocuSign
Related acceptance tests: None
