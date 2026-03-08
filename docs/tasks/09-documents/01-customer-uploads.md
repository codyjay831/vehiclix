Title: Task 09.01 - Customer Document Upload (Portal)
Purpose: Allow customers to securely provide required ID and insurance files.
Files likely touched: src/app/portal/documents/page.tsx, src/components/DocumentUpload.tsx
Implementation steps:
1. Create `src/app/portal/documents/page.tsx` with a list of required documents (Driver's License, Proof of Insurance).
2. Implement `DocumentUpload.tsx` with a drag-and-drop zone (Doc 09, 5).
3. Validate file types (PDF, JPEG, PNG) and size (max 10MB).
4. Update `DealDocument` record status to `UPLOADED` upon success.
Acceptance criteria:
- Customer can upload documents and see "Uploaded" status in the portal.
- All file validations work as expected.
Dependencies: Task 03.04, Task 01.02
Related epic: 09 — Documents, Uploads, and DocuSign
Related acceptance tests: DEP-001 (document requirement phase)
