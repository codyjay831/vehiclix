# Vehiclix Website Integration API v1 — Implementation Plan

**Mode:** PLAN ONLY — no implementation, no refactor, no code changes in this document.  
**Baseline:** [VEHICLIX_WEBSITE_INTEGRATION_API_V1_CANON.md](./VEHICLIX_WEBSITE_INTEGRATION_API_V1_CANON.md), [VEHICLIX_API_V1_GUARD_AND_IMPLEMENTATION_START.md](./VEHICLIX_API_V1_GUARD_AND_IMPLEMENTATION_START.md), [API_V1_CATALOG_VEHICLE_IDENTITY_NOTE.md](./API_V1_CATALOG_VEHICLE_IDENTITY_NOTE.md).

---

## 1. EXECUTIVE VERDICT

**Safest next implementation phase:**  
Execute **slug rollout** (migration + backfill), then **validation** of catalog detail and types. Immediately after that, add **guard/script enforcement** and begin **hardening** (login `from`, rate limiting, webhook clarification) in that order. Do **not** start storefront migration, docs, super-admin endpoint guide, or any new endpoint groups until slug rollout is verified and guards are in place.

**What should happen immediately (next 1–3 moves):**
1. Apply the `Vehicle.slug` migration to the database (if not already applied).
2. Run the slug backfill script; verify Prisma generate and slug resolution on real records.
3. Add minimal guard/scripts to prevent regression (e.g. no client `organizationId` in public handlers, no storefront-only privileged imports in API boundary).

**What should explicitly NOT happen yet:**
- No storefront migration to API consumption (remains deferred until API is stable and enforced).
- No endpoint guide in super-admin, no public docs portal, no website manager handoff tooling.
- No broad auth redesign, no storefront redesign, no new endpoint groups.
- No changes to core inventory, lead pipeline, deal/payment state machine, or Stripe deposit webhook behavior.

---

## 2. CURRENT STATE CHECK

### Already complete
- **API structure:** All five endpoint groups exist under `src/app/api/v1/`: `public/dealers`, `public/catalog` (list + `[vehicleId]` detail), `public/leads`, `public/reservations`, `auth-bridge`.
- **Dealer resolution:** `src/lib/api/resolve-dealer.ts` implements request-boundary resolution (domain-first, then `dealerSlug` fallback); never reads `organizationId` from client. All public handlers use it.
- **Public writes:** Leads and reservations handlers resolve dealer at boundary and pass only server-resolved `organizationId`; they do not trust client-provided org. Inquiry path uses vehicle-derived org internally; vehicle_request and reservation pass resolver output.
- **Catalog:** List uses `getPublicInventory`; detail uses `getPublicVehicleDetailBySlugOrId` (slug-first, id fallback). LISTED-only and dealer-scoping enforced in lib.
- **Auth-bridge:** Thin redirect to `/login` with `returnUrl`/`from` sanitized via `sanitizeReturnPath` (same-origin paths only); no password or session issuance in API.
- **Schema:** `Vehicle.slug` is present in Prisma schema with `@@unique([organizationId, slug])`. Migration file exists: `prisma/migrations/20260317000000_add_vehicle_slug/migration.sql`. Backfill script exists: `scripts/backfill-vehicle-slugs.ts`.
- **DTOs:** Public dealer, vehicle card, vehicle detail, lead input, reservation input DTOs exist and are used by the routes.

### Conditionally complete
- **Catalog detail:** Approved **once** migration is applied and backfill has been run. Until then, slug lookup will return no rows for existing vehicles (all slug null); id fallback keeps behavior working. After backfill, slug becomes primary and canonical.
- **Slug rollout:** Migration may or may not be applied to the target DB; backfill must be run after migration. Prisma generate must be run after schema/migration for types.

### What still blocks true API-first correctness
1. **Slug not yet live:** Without migration + backfill, public vehicle identity is effectively id-only; canon expects slug primary.
2. **Storefront is not API client #1:** Storefront still calls `getOrganizationBySlug`, `getPublicInventory`, `getPublicMakes`, `getFeaturedInventory`, `getPublicVehicleDetail`, `submitInquiryAction`, `submitVehicleRequestAction`, `initiateVehicleReservationAction` directly. So two paths exist; storefront remains privileged.
3. **No enforcement:** Nothing prevents future code from trusting client `organizationId`, or storefront from re-adding direct internal calls, or public identity drifting back to id-primary.
4. **Login `from` not validated inside core:** Auth-bridge sanitizes before redirecting to login, but the login flow itself (`auth.ts`, proxy verify-2fa) uses `from` without validation and could redirect off-site if `/login` is hit directly with a malicious `from`.
5. **Abuse protection:** Canon requires rate limiting and bot protection for public endpoints; not yet implemented.
6. **Stripe webhook ownership:** Two routes (`api/stripe/webhook`, `api/webhooks/stripe`) both use `STRIPE_WEBHOOK_SECRET`; ownership is ambiguous (single URL vs partitioned). Not yet clarified or partitioned.

### What still blocks storefront from being true client #1
- Storefront must be refactored to call `/v1/public/*` (and auth-bridge) instead of direct lib/actions. That work is explicitly deferred until after slug rollout, guard enforcement, and hardening are done.

---

## 3. PHASED IMPLEMENTATION PLAN

### Phase A: Slug rollout / migration execution  
**Objective:** Make `Vehicle.slug` the primary public identity in data and ensure catalog detail is canon-aligned.

| Item | Detail |
|------|--------|
| **Work** | Apply migration `20260317000000_add_vehicle_slug`; run `scripts/backfill-vehicle-slugs.ts`; run `npx prisma generate`; verify slug on sample vehicles per dealer; smoke-test GET catalog list and GET catalog detail by slug and by id. |
| **Order** | First. Catalog detail is approved only after this; no other phase depends on storefront. |
| **Dependencies** | Prisma schema already has slug; migration file and backfill script exist. |
| **Risk** | **Low** if applied in dev/staging first. Backfill is idempotent. |

---

### Phase B: Guard / script enforcement  
**Objective:** Prevent regression: no client org in public API, no privileged storefront-only imports in API boundary, no id-primary drift.

| Item | Detail |
|------|--------|
| **Work** | Add scripts or lint rules that: (1) fail if public v1 handlers or their direct callees read `organizationId` from request body/query/headers; (2) flag or fail if API routes import from storefront-only or direct server actions in a way that creates privileged paths; (3) optional: flag resolution by vehicle id without dealer scope in public API. |
| **Order** | After slug rollout. Ensures that once API is correct, it stays correct. |
| **Dependencies** | Phase A done so that “slug primary” is the norm to enforce. |
| **Risk** | **Low** (additive; start as warn, then promote to block CI). |

---

### Phase C: Hardening tasks  
**Objective:** Secure login redirect, reduce abuse risk on public writes, clarify webhook ownership.

| Item | Detail |
|------|--------|
| **Work** | (1) Harden login `from`: in `auth.ts` and proxy verify-2fa path, validate/sanitize `from` with same rules as `auth-bridge-utils` before redirecting. (2) Add rate limiting (and optional bot protection) for `/v1/public/leads` and `/v1/public/reservations`. (3) Document or refactor Stripe webhooks so ownership is singular or explicitly partitioned; no change to deposit completion behavior without approval. |
| **Order** | After Phase B so that structural guards are in place before adding security hardening. |
| **Dependencies** | Auth-bridge-utils already provides sanitizeReturnPath; reuse in auth and proxy. |
| **Risk** | **Medium** for login (must not break legitimate redirects); **low** for rate limiting (additive); **medium** for webhook (document-only is low; refactor is medium). |

---

### Phase D: Storefront migration  
**Objective:** Make storefront API client #1: consume `/v1/public/*` and auth-bridge instead of direct lib/actions.

| Item | Detail |
|------|--------|
| **Work** | Per Section 5 below: migrate storefront pages/components to call API endpoints instead of `getOrganizationBySlug`, `getPublicInventory`, `getPublicMakes`, `getFeaturedInventory`, `getPublicVehicleDetail`/`getPublicVehicleDetailBySlugOrId`, `submitInquiryAction`, `submitVehicleRequestAction`, `initiateVehicleReservationAction`. Use dealer context (domain or slug) and vehicle slug/id as the API contract. |
| **Order** | After Phases A–C. API must be stable and enforced; login redirect must be safe. |
| **Dependencies** | Slug live; guards in place; hardening done so storefront does not rely on privileged behavior. |
| **Risk** | **Medium** (behavioral change for storefront; must not break existing flows). |

---

### Phase E: Validation / rollout readiness  
**Objective:** Confirm API v1 is stable and safe for production and for storefront cutover.

| Item | Detail |
|------|--------|
| **Work** | Run Section 8 checklist: migration applied, backfill run, types valid, slug resolution verified, API smoke tests, no regression in storefront/leads/reservations/auth, auth-bridge redirect behavior verified. |
| **Order** | After slug rollout (Phase A) for initial validation; again after hardening (Phase C) and after storefront migration (Phase D) for full rollout. |
| **Dependencies** | Phases A–D as applicable. |
| **Risk** | **Low** (validation only). |

---

### Phase F: Later packaging (explicitly deferred)  
**Objective:** Docs, super-admin endpoint guide, developer portal, website manager tooling — all out of scope for next execution phase.

| Item | Detail |
|------|--------|
| **Work** | Endpoint guide in super-admin; public API docs portal; website manager handoff tooling; any broad auth or storefront redesign. |
| **Order** | After storefront is API client #1 and rollout checklist is green. |
| **Risk** | N/A (deferred). |

---

## 4. DETAILED TASK LIST

| # | Title | Description | Affected areas | Type | Blocking? | Confidence |
|---|--------|-------------|----------------|------|-----------|------------|
| 1 | Apply Vehicle.slug migration | Run Prisma migrate to add `Vehicle.slug` and unique index if not already applied. | `prisma/`, DB | migration | Yes for slug-primary behavior | High |
| 2 | Run slug backfill | Execute `scripts/backfill-vehicle-slugs.ts`; ensure all LISTED (or all) vehicles get slug. | DB, scripts | migration | Yes for catalog slug-primary | High |
| 3 | Prisma generate and type check | Run `npx prisma generate`; confirm no type errors in catalog/detail and DTOs. | `prisma/`, `src/lib/inventory.ts`, DTOs | validation | No | High |
| 4 | Verify slug resolution | Manually or via script: resolve a few vehicles by slug per dealer; confirm 200 and correct DTO. | Catalog detail, DB | validation | No | High |
| 5 | Guard: no client organizationId in public API | Script or lint: ensure no v1 public handler or shared API lib reads `organizationId` from body/query/header. | `src/app/api/v1/`, `src/lib/api/` | guardrail | No (warn first) | High |
| 6 | Guard: no privileged storefront imports in API | Script or lint: flag API routes importing storefront-only modules or calling server actions that are not also used by API. | `src/app/api/v1/` | guardrail | No (warn first) | Medium |
| 7 | Guard: vehicle resolution dealer-scoped | Optional: flag any public API path that resolves vehicle by id/slug without dealer scope. | Catalog, leads, reservations | guardrail | No | Medium |
| 8 | Harden login `from` in auth.ts | Before redirect, sanitize `from` with same logic as auth-bridge (e.g. reuse `sanitizeReturnPath`); only allow relative path. | `src/actions/auth.ts` | hardening | No (but high value) | High |
| 9 | Harden verify-2fa redirect in proxy | Before redirect after 2FA, sanitize `from` (same as auth); prevent off-site redirect. | `src/proxy.ts` | hardening | No | High |
| 10 | Rate limit /v1/public/leads | Add per-IP and optionally per-dealer rate limiting; optional honeypot/token. | `src/app/api/v1/public/leads/route.ts` or middleware | hardening | No | Medium |
| 11 | Rate limit /v1/public/reservations | Same as leads. | `src/app/api/v1/public/reservations/route.ts` or middleware | hardening | No | Medium |
| 12 | Stripe webhook ownership clarification | Document or refactor: single endpoint vs two endpoints with two secrets; no duplicate handling of payment_intent.succeeded; no behavior change without approval. | `src/app/api/stripe/webhook/`, `src/app/api/webhooks/stripe/`, docs | hardening | No | Medium |
| 13 | API smoke tests | GET dealers, catalog list, catalog detail (slug and id); POST leads (inquiry), POST reservations; GET auth-bridge redirect. | All v1 routes | validation | No | High |
| 14 | Regression: storefront | After any change, confirm storefront pages load and lead/reserve flows work. | Storefront pages | validation | Yes before release | High |
| 15 | Regression: auth-bridge redirect | Hit auth-bridge with valid/invalid returnUrl; confirm redirect to login with safe `from` and no off-site redirect. | Auth-bridge, login | validation | No | High |

**Production-behavior changes:** 1, 2 (migrations); 8, 9 (login/proxy redirect); 10, 11 (rate limiting).  
**Enforcement/visibility only:** 5, 6, 7.  
**Deferred:** Storefront migration tasks; endpoint guide; docs portal; super-admin API visibility.

---

## 5. STOREFRONT MIGRATION PLAN

**Principle:** Storefront becomes a consumer of `/v1/public/*` and `/v1/auth-bridge` only. No direct calls to internal libs or server actions for public data or public writes.

### Paths that currently bypass the API
- **Layout / org context:** `(marketing)/[dealerSlug]/layout.tsx` — `getOrganizationBySlug(dealerSlug)`.
- **Home:** `[dealerSlug]/page.tsx` — `getOrganizationBySlug`, `getFeaturedInventory(org.id)`.
- **Inventory list:** `[dealerSlug]/inventory/page.tsx` — `getOrganizationBySlug`, `getPublicInventory(org.id, filters)`, `getPublicMakes(org.id)`.
- **VDP:** `[dealerSlug]/inventory/[id]/page.tsx` — `getOrganizationBySlug`, `getPublicVehicleDetail(org.id, id)` (id from route).
- **Reserve page:** `[dealerSlug]/inventory/[id]/reserve/page.tsx` — `getOrganizationBySlug`, `getPublicVehicleDetail(org.id, vehicleId)`.
- **Other static pages:** about, contact, request-vehicle, register — `getOrganizationBySlug` for org/branding.
- **Components:** `InquiryModal` → `submitInquiryAction`; `VehicleRequestForm` → `submitVehicleRequestAction`; `ReservationClientPage` → `initiateVehicleReservationAction`.

### Migrate first (lowest risk, highest alignment)
1. **Dealer context:** Replace `getOrganizationBySlug(dealerSlug)` with GET `/v1/public/dealers?dealerSlug=…` (or rely on Host when on custom domain). Use response for branding, name, slug, homepage. Layout and all pages that only need dealer info switch to this.
2. **Catalog list:** Replace `getPublicInventory` + `getPublicMakes` with GET `/v1/public/catalog?…` (and optional makes from same or derived from list). Inventory list page uses only API.
3. **Catalog detail (VDP):** Replace `getPublicVehicleDetail(org.id, id)` with GET `/v1/public/catalog/[slugOrId]` (with dealer context). Use slug in URL when available (e.g. switch route to `[slugOrId]` and use slug from API). Reserve page vehicle fetch same.

### Migrate next (writes)
4. **Leads:** Replace `submitInquiryAction` in InquiryModal with POST `/v1/public/leads` (inquiry payload; dealer from Host or dealerSlug). Replace `submitVehicleRequestAction` in VehicleRequestForm with POST `/v1/public/leads` (vehicle_request payload; dealer from context).
5. **Reservations:** Replace `initiateVehicleReservationAction` in ReservationClientPage with POST `/v1/public/reservations`; use returned `clientSecret` and `dealId` for Stripe Confirm as today.
6. **Login entry:** Any “login” link that should return to storefront uses auth-bridge: `/api/v1/auth-bridge?returnUrl=…` instead of direct `/login?from=…` (auth-bridge already sanitizes).

### Migrate last / optional
7. **Featured inventory:** If catalog list supports a “featured” filter or param, use it; otherwise keep a minimal server-side call until API supports it, or derive from catalog list.
8. **Register flow:** If register is dealer-scoped, keep using server-rendered org for now unless a public “dealer context” endpoint is the only way to get org for branding.

### Leave untouched for now
- Admin, portal, super-admin: not storefront; no change.
- Core libs and actions: remain; only the **caller** (storefront vs API) changes. Do not remove or break actions until storefront is fully migrated and verified.
- Auth/session issuance, Stripe webhook, lead pipeline, deal/payment state machine: no redesign.

### How to validate storefront is no longer privileged
- Grep for imports of `@/lib/inventory`, `@/actions/inquiry`, `@/actions/request`, `@/actions/payment` from storefront pages/components that serve public flows. After migration, those should be gone for public data/writes (or only used in a single “API client” layer that calls fetch to `/v1/public/*`).
- Guard script: no file under `(marketing)` or `components/public` should import directly from `@/lib/inventory` or the lead/reservation actions for the purpose of fetching public inventory or submitting leads/reservations. Optional: allow a small `apiClient` module that only calls fetch to v1 public endpoints.

---

## 6. GUARD / SCRIPT PLAN

| Guard | What it checks | How to run | Severity if violated | Block CI initially? |
|-------|----------------|------------|----------------------|----------------------|
| No client `organizationId` | No reading of `organizationId` (or equivalent) from `request.json()`, `searchParams`, or headers in `src/app/api/v1/public/**` or in `src/lib/api/resolve-dealer.ts` (resolver must not accept org from client). | Lint rule or small Node script scanning for patterns (e.g. body.organizationId, searchParams.get('organizationId')). | High (canon violation; security). | Warn first; then block. |
| No privileged storefront imports in API | API route files under `api/v1` do not import from storefront-specific modules or from server actions that are only used by storefront for the same operation. | Script: list imports of `@/actions/inquiry`, `@/actions/request`, `@/actions/payment`, `@/lib/organization` in `api/v1` and allow only if that action is the shared core (e.g. API calls action with server-resolved context). Refinement: flag if a handler passes client-supplied org into an action. | Medium (architectural drift). | Warn first. |
| Vehicle resolution dealer-scoped | In public catalog/leads/reservations, vehicle is always resolved with `organizationId` from resolveDealerFromRequest, never from body/query. | Script or code review: ensure `getPublicVehicleDetailBySlugOrId(organization.id, …)` (or equivalent) and no `getPublicVehicleDetail*(..., id)` without org from resolver. | High | Warn first; then block. |
| Id vs slug primary | Public catalog detail accepts slug; response DTO exposes slug when present. Optional: flag if new code uses only id for public vehicle identity in new endpoints. | Doc + review; optional lint on DTO or route. | Medium | No (informational). |
| Stripe webhook single owner | No duplicate handling of `payment_intent.succeeded`; exactly one route owns deposit completion. | Doc + manual check; optional script that greps for `payment_intent.succeeded` and fails if count ≠ 1. | High | Warn. |
| Login return path | After hardening, login and proxy only redirect to sanitized paths. | Test or script: call login with malicious `from`; expect redirect to default, not to external URL. | High | N/A (test). |

---

## 7. HARDENING PLAN

| Task | Why it matters | Urgency | Safest order |
|------|----------------|---------|--------------|
| Login `from` validation | Today, login and verify-2fa use `from` unchecked; a direct request to `/login?from=https://evil.com` could redirect user off-site after login. Auth-bridge sanitizes before redirecting to login, but the core login flow does not. | High (security). | 1. Reuse `sanitizeReturnPath` in `auth.ts` before setting redirect target (and before passing `from` to 2FA URL). 2. Reuse same in proxy when redirecting after verify-2fa. Use same-origin path only; otherwise use defaultRedirect. |
| Rate limiting for leads | Prevents lead spam and abuse; canon requires it. | Medium. | After login hardening. Add per-IP (and optionally per-dealer) limit; optional honeypot already in lead input. |
| Rate limiting for reservations | Prevents reservation abuse and payment noise. | Medium. | Same as leads; can be same middleware or pattern. |
| Stripe webhook ownership | Two routes, one secret: ambiguous. Canon requires singular or explicitly partitioned ownership. | Medium. | Document first: which URL is used in production; partition by event type (deposits vs billing) or merge into one route. Do not change deposit completion logic without explicit approval. |
| Rollout checks for slug | Ensure migration and backfill are applied and Prisma types are current before treating catalog as slug-primary. | High for correctness. | Part of Phase A and Section 8 checklist. |

---

## 8. ROLLOUT / VALIDATION CHECKLIST

Before treating API v1 as stabilized and before storefront migration:

- [ ] **Migration applied:** `20260317000000_add_vehicle_slug` has been applied to the target database.
- [ ] **Slug backfill run:** `scripts/backfill-vehicle-slugs.ts` has been executed; vehicles that should have slugs have them.
- [ ] **Prisma generate / types:** `npx prisma generate` run; no type errors in `src/lib/inventory.ts`, catalog routes, or DTOs.
- [ ] **Slug resolution verified:** For at least one dealer, GET `/v1/public/catalog/<slug>` and GET `/v1/public/catalog/<id>` both return 200 and correct DTO; slug is present in response when present in DB.
- [ ] **API endpoint smoke tests:** GET dealers (with Host or dealerSlug), GET catalog list, GET catalog detail; POST leads (inquiry and vehicle_request); POST reservations; GET auth-bridge with returnUrl — all behave as specified.
- [ ] **No regression in storefront:** Home, inventory list, VDP, reserve, lead forms, and request-vehicle work unchanged (still using current direct lib/action calls until migration).
- [ ] **No regression in leads/reservations/auth:** Existing inquiry, vehicle request, reservation, and login flows work; no duplicate or dropped leads; deposit completion still works via existing webhook.
- [ ] **Auth-bridge safe redirect:** Request to auth-bridge with valid relative returnUrl redirects to login with sanitized `from`; with invalid or absolute returnUrl, redirect to login without from (or safe default). No off-site redirect.

After storefront migration, re-run: API smoke tests, full storefront flows (including lead and reservation), and auth-bridge behavior.

---

## 9. WHAT NOT TO DO YET

- **Endpoint guide in super-admin:** Deferred until after storefront migration and rollout checklist.
- **Public docs portal / developer portal:** Deferred.
- **Website manager handoff tooling:** Deferred.
- **Broad auth redesign:** Do not touch. Only harden `from` handling in existing flow.
- **Storefront redesign:** Do not redesign; only migrate data/write paths to API consumption.
- **Speculative abstractions:** No new middleware or framework beyond what is needed for rate limiting and guards.
- **New endpoint groups:** None; v1 is locked to the five groups.
- **Changing core behavior:** No rewrite of inventory, lead pipeline, deal/payment state machine, auth/session issuance, VIN, or storage. No change to Stripe deposit webhook behavior without explicit approval.
- **Removing or breaking existing server actions:** Keep them until storefront is fully migrated and verified.

---

## 10. FINAL RECOMMENDATION

**Next 1–3 implementation moves (in order):**

1. **Apply slug migration and run backfill** (Phase A). Confirm migration applied, run `scripts/backfill-vehicle-slugs.ts`, run `npx prisma generate`, then verify one or two vehicles per dealer resolve by slug via GET catalog detail. This unblocks full canon alignment for catalog and sets the basis for guard enforcement.
2. **Add the “no client organizationId” guard** (Phase B). Implement a small script or lint that fails or warns if any v1 public handler (or its direct API lib) reads `organizationId` from request body, query, or headers. Run it in CI as warn first, then promote to block. Prevents regression and enforces canon.
3. **Harden login `from` in auth and proxy** (Phase C). In `auth.ts` and in proxy’s verify-2fa redirect, reuse `sanitizeReturnPath` (or equivalent) on `from` before redirecting; if invalid, use default redirect. No new auth surface; closes open-redirect risk.

**Hold until after slug rollout and guards:**
- Storefront migration (Phase D).
- Endpoint guide, docs portal, super-admin API visibility (Phase F).
- Any refactor of Stripe webhook routing (beyond documentation).

**Success:** After these three moves, the system has slug-primary catalog, a guard against client-org trust, and safe login redirects, without breaking inventory, leads, reservations, payments, or auth. The next phase can then add rate limiting, webhook documentation, and storefront migration in a controlled order.
