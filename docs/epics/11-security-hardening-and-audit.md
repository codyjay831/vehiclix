# 11 — Security Hardening and Audit

## 1. Epic Title
Security Hardening, Middleware, and Transactional Audit

## 2. Purpose
Finalize the platform's security posture, ensuring that all data boundaries are enforced, audit trails are complete, and the system is resilient against common vulnerabilities and transactional race conditions.

## 3. User / Business Value
Protects sensitive customer PII and dealership financial data. Provides the Owner with a legally defensible audit trail of all significant actions (who did what and when).

## 4. Canon Dependencies
- `docs/canon/07` (Auth, Security, and Audit)
- `docs/canon/02` (User Roles)
- `docs/canon/11` (Audit Event Types)
- `docs/canon/12` (XSY tests, Security Checklist)

## 5. In Scope
- **Middleware Enforcement:**
  - Route-level protection for `/admin` (Owner role + 2FA check).
  - Route-level protection for `/portal` (Authenticated check).
  - ID-based resource isolation (Customers only see their own IDs).
- **Audit System:**
  - Full coverage for all event types in `docs/canon/11, Section 8`.
  - Immutable append-only logging.
  - Admin view for global activity logs.
- **Signed URL Access:** Finalization of private file proxying/signed URLs.
- **Rate Limiting:** Enforcement on Login, Register, Inquiries, and Vehicle Request forms.
- **Transaction Integrity:**
  - Idempotent webhook handlers.
  - Daily reconciliation background job for payment/status sync (Doc 11, 9.2).
- **Owner Security:** Enforced 2FA (TOTP) for the single Owner account.

## 6. Out of Scope
- Penetration testing (external service).
- Infrastructure-level WAF/DDOS configuration.
- Multi-region database replication.

## 7. Actors
- Owner
- System (Audit/Reconciliation)

## 8. Core Entities Touched
- `ActivityEvent`
- `All transaction entities` (Deal, Deposit, Vehicle, etc.)

## 9. Main User Flows
- **Enforcement:** Customer tries to access `/admin/deals` and is redirected to `/login` or 403 (Doc 07, 4).
- **Audit:** Owner performs a status change; the system logs the change and the previous/new values in the timeline.

## 10. Owner/Admin Flows
- Setting up 2FA on the Owner account for the first time.
- Reviewing the Global Activity Log to verify a deposit success.

## 11. States and Transitions
- N/A (Meta-epic for integrity).

## 12. UI Surfaces
- `/admin/audit-logs` (Global view)
- `/admin/settings/security` (2FA Setup)
- Custom 403/404 pages.

## 13. API / Backend Responsibilities
- Middleware logic for role and 2FA verification.
- HMAC verification for ALL incoming webhooks (Stripe/DocuSign).
- Background task scheduler (for reconciliation jobs).
- Global rate-limiter implementation.

## 14. Security / Audit Requirements
- Strictly NO PII in audit log metadata (use IDs only).
- Signed URLs must expire in <15 minutes.
- Passwords MUST use Argon2 or bcrypt with high work factors.

## 15. Acceptance Criteria
- [ ] Middleware blocks unauthorized access to `/admin` and `/portal` (Test INV-010 boundary).
- [ ] 2FA is required for Owner login (Doc 07, 2).
- [ ] Audit logs exist for all events listed in Doc 11 (Test XSY-004).
- [ ] Rate limiting triggers after 5 failed login attempts or 10 rapid form submissions.
- [ ] Reconciliation job correctly identifies and fixes status desyncs (Test XSY-002 edge case).

## 16. Edge Cases / Failure Cases
- **Database Failure during logging:** Critical actions should be wrapped in transactions that include the audit log write.
- **Webhook Replays:** Webhook handlers must be idempotent to handle Stripe/DocuSign retries (Doc 11, 9.2).

## 17. Dependencies on Other Epics
- `Epic 01` through `Epic 10` (Hardens all of them).

## 18. Deferred Items / Notes
- Automated IP blocking for malicious actors.
- Real-time security alerts via SMS.
