Title: Task 09.02 - Private File Storage and Signed URLs
Purpose: Ensure all sensitive customer documents are stored securely and accessed only by authorized users.
Files likely touched: src/lib/storage.ts, src/app/api/documents/[id]/route.ts
Implementation steps:
1. Configure a private S3 bucket or equivalent storage provider.
2. Implement a `getSignedUrl` helper in `src/lib/storage.ts` that generates short-lived URLs.
3. Use server-side session checks to verify that only the owner or the linked customer can request these URLs.
Acceptance criteria:
- Document URLs are not public and expire within 15 minutes.
- Only authorized users can access the document retrieval API.
Dependencies: Task 01.01, Task 01.03
Related epic: 09 — Documents, Uploads, and DocuSign
Related acceptance tests: None (security requirement)
