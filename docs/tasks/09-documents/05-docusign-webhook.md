Title: Task 09.05 - DocuSign Webhook Listener (Completed)
Purpose: Automate the final signature confirmation and update the deal status.
Files likely touched: src/app/api/docusign/webhook/route.ts, src/lib/actions/docusign.ts
Implementation steps:
1. Implement an API route `src/app/api/docusign/webhook/route.ts` that verifies the DocuSign signature (HMAC).
2. Listen for the `envelope-completed` event.
3. Update `DocuSignEnvelope.envelopeStatus = COMPLETED` and `Deal.dealStatus = Contracts Signed`.
4. Implement a background job to download and store the signed PDF in the private storage (Doc 11, 8.5).
Acceptance criteria:
- Marking an envelope as "Completed" in DocuSign correctly updates the deal status (Doc 11, 8.5).
- Signed PDF is successfully retrieved and stored securely.
Dependencies: Task 09.04, Task 09.02
Related epic: 09 — Documents, Uploads, and DocuSign
Related acceptance tests: None (structural verification)
