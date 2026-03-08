Title: Task 03.02 - Email Verification Flow
Purpose: Ensure customer email addresses are valid before high-stakes actions.
Files likely touched: src/app/verify-email/page.tsx, src/lib/actions/auth.ts
Implementation steps:
1. Implement a server action to send verification emails with a token.
2. Create `src/app/verify-email/page.tsx` that handles the token validation.
3. Update the `Customer` record with `emailVerified = true` on success.
Acceptance criteria:
- Customers receive a verification email upon registration.
- Clicking the link correctly verifies the email address.
Dependencies: Task 03.01
Related epic: 03 — Customer Auth and Portal
Related acceptance tests: XSY-005 (verification step)
