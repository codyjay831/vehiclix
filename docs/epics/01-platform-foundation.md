# 01 — Platform Foundation

## 1. Epic Title
Platform Foundation: Core Architecture and Shared Scaffolding

## 2. Purpose
Establish the technical baseline for the Evo Motors platform, including project structure, database schema, core authentication/authorization patterns, and shared UI foundations.

## 3. User / Business Value
Ensures a stable, consistent, and secure environment for both Customer and Owner experiences. It provides the "pipes" for identity resolution, media storage, and audit logging required for high-trust vehicle transactions.

## 4. Canon Dependencies
- `docs/canon/01` (Vision/MVP)
- `docs/canon/02` (Roles/Access)
- `docs/canon/07` (Auth/Security)
- `docs/canon/08` (UX Design Rules)
- `docs/canon/11` (Data Relationships and CTA Mapping)

## 5. In Scope
- Next.js 14+ App Router project structure.
- Tailwind CSS and shadcn/ui base configuration.
- Prisma schema with all models defined in `docs/canon/11`.
- Global Enums (VehicleStatus, DealStatus, etc.) as the core application state machine.
- Environment variable configuration (Stripe, DocuSign, S3, PostgreSQL).
- Role-based middleware scaffolding (Owner vs Customer).
- Identity resolution rules (Email-based stub customer creation).
- Private vs Public storage configuration (S3/Signed URLs).
- Audit Event (ActivityEvent) model and basic logging helper.
- Global Error/Loading states and Toast notification provider.

## 6. Out of Scope
- Final feature implementations for inventory, portal, or deals.
- Live Stripe or DocuSign API calls (mock/stub configuration only).
- Manual trade-in or financing forms.

## 7. Actors
- System / Developer
- Owner (for initial provisioning)

## 8. Core Entities Touched
- `Customer` (Stub vs Verified logic)
- `ActivityEvent`
- `All Enums` (Drivetrain, VehicleStatus, DealStatus, etc.)

## 9. Main User Flows
- Initial Landing (Anonymous visitor check).
- Stub Customer creation on any lead capture (Email-based resolution).
- Redirection to Login/Register when accessing protected portal routes.

## 10. Owner/Admin Flows
- Owner login flow initiation (middleware check for 2FA requirement).
- Access to the `/admin` route group (protected by OWNER role).

## 11. States and Transitions
- N/A (Foundation provides the state *holders* but not the *logic*).

## 12. UI Surfaces
- Global Layout (Navigation and Footer skeletons).
- Admin Dashboard Shell (Sidebar, Header).
- Customer Portal Shell (Breadcrumbs, Layout).
- Shared components: `Toast`, `ConfirmationDialog`, `StatusBadge`, `SkeletonLoader`.

## 13. API / Backend Responsibilities
- Database connection management.
- Identity resolution utility (Check for existing email, create stub if missing).
- Signed URL generation helper for private files.
- Audit logger helper (`logEvent(type, actor, entity, metadata)`).

## 14. Security / Audit Requirements
- Strictly HTTP-only, SameSite cookies for sessions.
- CSRF protection across all state-changing routes.
- 2FA requirement flag on Owner sessions.
- Audit logging for every state change (Section 8 in `docs/canon/11`).

## 15. Acceptance Criteria
- [ ] Next.js app renders a placeholder homepage.
- [ ] `npx prisma db push` successfully syncs the schema from `docs/canon/11`.
- [ ] Middleware blocks `/admin` routes unless a user has `Role.OWNER`.
- [ ] Middleware blocks `/portal` routes unless a user is authenticated.
- [ ] `logEvent` creates an `ActivityEvent` record in the database.
- [ ] Private file retrieval generates an expiring signed URL (mock S3 for dev).

## 16. Edge Cases / Failure Cases
- **Duplicate Email:** Stub customer creation must check for uniqueness (Doc 11, 5.1).
- **Session Expiry:** Owner sessions must expire after 8h (Doc 07, 3).
- **Environment Mismatches:** App fails gracefully if critical API keys are missing.

## 17. Dependencies on Other Epics
- None (This is the foundation).

## 18. Deferred Items / Notes
- Final UI styling for specific pages (dealt with in following epics).
- Actual Stripe/DocuSign integration logic.
