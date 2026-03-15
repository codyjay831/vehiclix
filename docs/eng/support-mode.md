# Engineering Documentation: Vehiclix Support Mode v1

## 1. Architectural Decision
Support Mode v1 is implemented as a **Session Overlay**, not as full User Impersonation.

### Why Session Overlay?
- **Preserve Identity**: `actorId` and `actorRole` remain the `SUPER_ADMIN`'s identity. This is critical for security and audit integrity.
- **Safety**: There is no risk of a `SUPER_ADMIN` "becoming" another user's account with persistent tokens.
- **Auditing**: All actions taken in support mode are naturally attributed to the `SUPER_ADMIN`.
- **Read-Only Enforcement**: By having a specific session field (`supportOrgId`), we can centrally block all write operations at the action level.

## 2. Behavioral Flow

### Support Session Start
- `startSupportSession(orgId: string)`:
  - Requires `SUPER_ADMIN` role.
  - Validates the target organization exists.
  - Injects `supportOrgId` into the JWT session payload.
  - Redirects the user to `/admin`.

### Support Session Access Rules
- **Middleware Access**: `/admin/*` routes are unlocked for `SUPER_ADMIN` **only** if `supportOrgId` is present in the active session.
- **Context Resolution**: `requireUserWithOrg()` automatically resolves `organizationId` to `supportOrgId` for `SUPER_ADMIN` in support mode.
- **Write Protection**: Any server action calling `requireWriteAccess()` will throw an error if `isSupportMode` is active.

### Support Session Stop
- `stopSupportSession()`:
  - Clears `supportOrgId` from the session.
  - Redirects back to the super-admin dashboard.

## 3. Developer Checklist for /admin Mutations
Any future mutation action reachable from `/admin` must follow these rules to maintain support mode safety:

- [ ] **Must call `requireWriteAccess()`**: Call this first to block all support mode writes.
- [ ] **Must use `requireUserWithOrg()`**: This correctly resolves the target organization context.
- [ ] **Avoid hardcoding `actorRole: Role.OWNER`**: Use `user.role` from the session context for audit logging.
- [ ] **Preserve `actorId`**: Always use `user.id` from the session for audit logs.
- [ ] **UI Visibility**: If adding new layout areas, ensure they honor the support mode banner.

## 4. Known v1 Limitations
- **Read-Only Only**: Support mode cannot perform any write actions (v1 expectation).
- **Session-Based Only**: No persistent `SupportSession` table exists; state lives entirely in the JWT.
- **Metrics Impact**: Metric increments (like vehicle views/shares) are manually skipped in support mode.
- **Manual 2FA Bypass**: Owners require 2FA to access `/admin`. Support mode (via `SUPER_ADMIN`) bypasses the owner's 2FA check because the support staff has already passed their own authentication.

## 5. Audit Event Requirements
All support mode actions MUST be logged with:
- `eventType`: `support.*` (e.g., `support.session_started`, `support.action_attempted`)
- `actorId`: The `SUPER_ADMIN` user's ID.
- `actorRole`: `SUPER_ADMIN`.
- `organizationId`: The target organization's ID.

## 6. Support Mode Contract (Architecture Guardrails)
To prevent architectural drift, the following rules are enforced by the repository protection layer:

**RULE 1 — Support mode requires explicit session context**
SUPER_ADMIN cannot access /admin unless session.supportOrgId exists.

**RULE 2 — Identity must never change**
SUPER_ADMIN must remain the actor in all support mode actions.

**RULE 3 — Support mode is read-only in v1**
All mutation paths must call requireWriteAccess().

**RULE 4 — Organization context is resolved via requireUserWithOrg()**
Never manually assign organizationId.

**RULE 5 — Audit logs must always use:**
actorId: user.id
actorRole: user.role

**RULE 6 — Support mode must always be visible in the UI**
The support banner must appear in /admin layout when isSupportMode === true.
