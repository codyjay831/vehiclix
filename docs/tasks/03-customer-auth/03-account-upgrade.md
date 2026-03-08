Title: Task 03.03 - Stub-to-Full Account Upgrade
Purpose: Link existing inquiries and requests to a new customer account based on email.
Files likely touched: src/lib/auth.ts, src/lib/actions/auth.ts
Implementation steps:
1. On registration, check for existing stub `Customer` records with the same email.
2. Link all existing `VehicleInquiry`, `VehicleRequest`, and `Deal` records to the new user ID.
3. Upgrade the stub record to a full account with a password.
Acceptance criteria:
- New accounts correctly link to prior inquiries and deals (Test XSY-005).
- No data is lost during the account upgrade process.
Dependencies: Task 03.01, Task 05.01, Task 06.01
Related epic: 03 — Customer Auth and Portal
Related acceptance tests: XSY-005
