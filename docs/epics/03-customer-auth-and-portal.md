# 03 — Customer Auth and Portal

## 1. Epic Title
Customer Authentication and Purchase Portal

## 2. Purpose
Build the secure infrastructure for customers to register accounts, log in, and track their purchase progress through a personalized portal. This epic handles the "Onboarding" and "Transaction Readiness" phases of the journey.

## 3. User / Business Value
Provides customers with a "Single Source of Truth" for their car purchase, reducing friction and phone/email back-and-forth. High-trust digital portal builds premium brand sentiment.

## 4. Canon Dependencies
- `docs/canon/02` (User Roles and Access)
- `docs/canon/03` (Customer Journeys)
- `docs/canon/07` (Auth and Security)
- `docs/canon/10` (Scenario O, R)
- `docs/canon/11` (Identity Resolution Rules)

## 5. In Scope
- **Authentication:**
  - Email/Password registration and login.
  - Email verification flow.
  - Password reset flow.
  - Stub-to-Full account upgrade (Doc 11, 5.1).
- **Portal Shell:**
  - Customer navigation (Dashboard, Active Deals, Requests, Documents).
  - Logout functionality.
- **Dashboard:**
  - Active Deal Card (Milestone Tracker).
  - Status-specific messaging (Doc 10, Scenario R).
  - Links to Next Actions (Upload, Sign, etc.).
- **Request Tracking:** List and detail view for vehicle sourcing requests (Read-only for now).
- **History:** Read-only list of past inquiries.

## 6. Out of Scope
- Document upload implementation (Epic 09).
- Sourcing proposal accept/decline logic (Epic 06).
- Deal status management logic (Epic 07).

## 7. Actors
- Customer
- System (for email verification)

## 8. Core Entities Touched
- `Customer` (Upgrade from stub)
- `Deal`
- `VehicleRequest`

## 9. Main User Flows
- **Registration:** Anonymous visitor with a prior deposit/inquiry creates an account and sees their data (Test XSY-005).
- **Portal Entry:** Customer logs in and views their "Active Deal" milestone tracker (Scenario R).

## 10. Owner/Admin Flows
- None (This epic is customer-facing).

## 11. States and Transitions
- Customer: `emailVerified = false → true`.

## 12. UI Surfaces
- `/register`, `/login`, `/verify-email`
- `/portal` (Dashboard)
- `/portal/deals/[id]` (Progress view)
- `MilestoneTracker` component.

## 13. API / Backend Responsibilities
- Session management (30-day expiry for customers).
- Secure password hashing (Argon2/bcrypt).
- Email service integration for verification/resets.
- Identity merging logic (linking stub records by email).

## 14. Security / Audit Requirements
- Role isolation: Customers cannot access `/admin`.
- CSRF protection.
- Secure HTTP-only cookies.
- Rate limiting on auth endpoints (Doc 07, 10).

## 15. Acceptance Criteria
- [ ] Customer can register and verify email.
- [ ] Stub customer records (inquiries, requests) are linked upon registration with the same email (Test XSY-005).
- [ ] Portal dashboard renders correct milestone status for an active deal (Scenario R).
- [ ] Logout invalidates the session and redirects to `/login`.

## 16. Edge Cases / Failure Cases
- **Duplicate Registration:** Registering with an already verified email shows a link to login.
- **Expired Verification Link:** User is prompted to resend the verification email.
- **Unverified Access:** Specific portal features (e.g., uploads) are disabled until email is verified.

## 17. Dependencies on Other Epics
- `Epic 01` (Foundation, Schema).
- `Epic 02` (for existing inquiry data to test merging).

## 18. Deferred Items / Notes
- Social Login (Google/Apple) is deferred (Doc 02).
- Real-time chat within the portal (Doc 09).
