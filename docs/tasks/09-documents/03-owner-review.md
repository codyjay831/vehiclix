Title: Task 09.03 - Owner Document Review (Admin)
Purpose: Allow the owner to verify or reject customer-uploaded documents.
Files likely touched: src/app/admin/deals/[id]/page.tsx, src/lib/actions/document.ts
Implementation steps:
1. Add a "Documents" section to the admin deal detail page.
2. Render all uploaded documents with status badges.
3. Implement "Verify" and "Reject" actions for the owner (Epic 09, 5).
4. For rejections, prompt the owner for a reason to share with the customer.
Acceptance criteria:
- Owner can view and verify/reject all uploaded customer documents.
- Rejected status updates both the deal and the portal visibility.
Dependencies: Task 07.01, Task 09.01
Related epic: 09 — Documents, Uploads, and DocuSign
Related acceptance tests: None
