Title: Task 11.02 - 2FA Enforcement (Owner Account)
Purpose: Protect the single owner account with mandatory two-factor authentication.
Files likely touched: src/app/admin/login/2fa/page.tsx, src/lib/auth.ts
Implementation steps:
1. Implement TOTP-based 2FA in `src/lib/auth.ts` using `speakeasy` or `otplib`.
2. Add a `/admin/login/2fa` step to the owner login flow.
3. Update the admin middleware to check for a valid 2FA token on the owner session (Doc 07, 2).
Acceptance criteria:
- Owner login is blocked without a valid 2FA token (Test XSY-004 context).
- 2FA is mandatory for the Owner role.
Dependencies: Task 01.03, Task 03.01
Related epic: 11 — Security Hardening and Audit
Related acceptance tests: None (security requirement)
