# Vehiclix Website Integration API v1 — Guard & Implementation Start

**Context:** Implementing API v1 per [VEHICLIX_WEBSITE_INTEGRATION_API_V1_CANON.md](./VEHICLIX_WEBSITE_INTEGRATION_API_V1_CANON.md). This document is the output of the verification and design phase. **No implementation yet** — structure and plan only.

---

## 1. System Audit

### 1.1 Dealer resolution

| Location | Mechanism | Reusable for API? |
|----------|-----------|-------------------|
| **`src/proxy.ts`** | Custom domain → `/api/org/resolve-domain?host=...` → `slug` → rewrite to `/[slug]/path`. Platform host and `?org=id` use `/api/org/resolve-slug?id=...` → `slug`. | Yes — domain-first already at edge. API must resolve dealer the same way at request boundary. |
| **`src/app/api/org/resolve-domain/route.ts`** | GET; `host` param → `OrganizationDomain` (VERIFIED) → `organization.slug`. | Yes — internal resolver; API layer can call same DB pattern or a shared `resolveDealerFromRequest(request)` helper. |
| **`src/app/api/org/resolve-slug/route.ts`** | GET; `id` param (org id or slug) → `Organization.findFirst({ OR: [{ id }, { slug: id }] })` → `slug`. | Yes — slug fallback. |
| **`src/lib/organization.ts`** | `getOrganizationBySlug(slug)`, `getOrganizationById(id)` — used by pages. | Yes — core read helpers. |
| **Storefront layout/pages** | `(marketing)/[dealerSlug]/layout.tsx` and all `[dealerSlug]` pages call `getOrganizationBySlug(dealerSlug)` from params. | Not reusable as-is for API — API has no route params; must resolve from Host header or from a single allowed query/header (e.g. `dealerSlug`) at boundary. |

**Summary:** Dealer resolution exists and is domain-first in proxy; slug is used in app routes. It is **not** centralized for API: there is no single “resolve dealer from request” used by both pages and API. Reuse: add a **request-boundary** helper that, given `Request`, returns dealer (e.g. from Host → domain lookup, or from `?dealerSlug=` / header in approved contexts).

---

### 1.2 Inventory fetch

| Location | Function / usage | Reusable? |
|----------|------------------|-----------|
| **`src/lib/inventory.ts`** | `getPublicInventory(organizationId, filters)`, `getPublicMakes(organizationId)`, `getFeaturedInventory(organizationId)`, `getPublicVehicleDetail(organizationId, id)`. All filter `vehicleStatus: LISTED`, include media, enrich URLs via `getPublicUrl`. | Yes — these are the single source of truth. API handlers must call these with **server-resolved** `organizationId` only. |
| **`src/app/(marketing)/[dealerSlug]/page.tsx`** | `getFeaturedInventory(org.id)` — org from `getOrganizationBySlug(dealerSlug)`. | Storefront calls lib directly (bypasses API). |
| **`src/app/(marketing)/[dealerSlug]/inventory/page.tsx`** | `getPublicInventory(org.id, filters)`, `getPublicMakes(org.id)`. | Same. |
| **`src/app/(marketing)/[dealerSlug]/inventory/[id]/page.tsx`** | `getPublicVehicleDetail(org.id, id)` — vehicle by **id** (not slug). | Same. Canon expects slug-based vehicle identity; Vehicle model has **no slug field** today — use id as fallback until slug exists. |

**Summary:** Catalog logic lives in `src/lib/inventory.ts`; it is reusable. Storefront uses it directly (no API). Vehicle public identity is currently **id**; add **slug** to Vehicle later for canon-compliant primary identity.

---

### 1.3 Lead creation

| Location | Function / usage | Reusable? |
|----------|------------------|-----------|
| **`src/actions/inquiry.ts`** | `submitInquiryAction(data)` — takes `vehicleId`, contact fields, honeypot. **Does not take organizationId from client.** Resolves org from vehicle: `Vehicle.findFirst({ id: vehicleId, vehicleStatus: LISTED })` → `vehicle.organizationId`. Creates stub user, VehicleInquiry, `ensureLeadForInbound`, activity event, `notifyDealerOfLead`. | Yes — safe. API must call this (or same logic) with **server-resolved** dealer and vehicle (vehicle must belong to dealer). |
| **`src/components/public/InquiryModal.tsx`** | Calls `submitInquiryAction` with vehicleId + form data. | Storefront uses action directly (bypasses API). |
| **`src/actions/request.ts`** | `submitVehicleRequestAction(data)` — takes **client-provided `organizationId`**, validates org exists, then creates VehicleRequest and lead. | **Not safe for public API** — must not trust client `organizationId`. API must resolve dealer from request (domain/slug) and ignore body.organizationId. |

**Summary:** Inquiry path is dealer-safe (org from vehicle). Vehicle request path **trusts client organizationId** — gap for API.

---

### 1.4 Reservations

| Location | Function / usage | Reusable? |
|----------|------------------|-----------|
| **`src/actions/payment.ts`** | `initiateVehicleReservationAction(data)` — takes **`organizationId` in payload** (and vehicleId, contact). Verifies vehicle LISTED and `vehicle.organizationId === organizationId`, then creates Deal, DealDeposit, PaymentIntent, CRM lead, audit. | **Not canon-compliant for public API** — dealer must be resolved at boundary, not from client. Logic (vehicle check, deal/deposit creation, Stripe) is correct; only the **source of organizationId** must change for API. |
| **`src/components/public/ReservationClientPage.tsx`** | Gets `organizationId` from layout/route (TenantProvider / server-rendered props) and passes to `initiateVehicleReservationAction`. | Storefront passes server-derived org; external API client could send arbitrary org — so API must not accept organizationId from body. |
| **`src/app/api/stripe/webhook/route.ts`** | POST; `payment_intent.succeeded` → find DealDeposit by stripePaymentId → update deposit, deal (DEPOSIT_RECEIVED), vehicle (RESERVED), activity. | Yes — do not change. Single owner for deposit completion. |

**Summary:** Reservation **business logic** is reusable; **initiateVehicleReservationAction** must not accept client-provided `organizationId` when used from public API — API handler resolves dealer and calls core with that only.

---

### 1.5 Auth / session

| Location | Function / usage | Reusable? |
|----------|------------------|-----------|
| **`src/lib/auth.ts`** | `getAuthenticatedUser()` (cookie `evo_session` → decrypt → load user). `requireUserWithOrg()`, `requireOrgMember()`. | Yes — session issuance stays in core; API does not issue sessions. |
| **`src/actions/auth.ts`** | Login, register, 2FA, invite acceptance, support session — all set cookie / session. | Yes — auth-bridge will **redirect** to existing login/register flows and return URL; no new password auth exposed. |
| **`src/lib/session.ts`** | Encrypt/decrypt session payload. | Yes — do not touch. |

**Summary:** Auth and session stay in core. API v1 auth-bridge is redirect-only; no new auth surface.

---

## 2. API Structure Plan (no implementation)

Canon paths:

- `/v1/public/dealers` (read-only: branding, homepage, canonical domain)
- `/v1/public/catalog`
- `/v1/public/leads`
- `/v1/public/reservations`
- `/v1/auth-bridge`

Physical layout under **`src/app/api/v1/`**:

- `src/app/api/v1/public/dealers/route.ts` (and optional `[dealerSlug]/route.ts` if needed)
- `src/app/api/v1/public/catalog/route.ts` (list) and e.g. `src/app/api/v1/public/catalog/[vehicleIdOrSlug]/route.ts` (VDP)
- `src/app/api/v1/public/leads/route.ts` (POST only)
- `src/app/api/v1/public/reservations/route.ts` (POST initiate)
- `src/app/api/v1/auth-bridge/route.ts` (redirect flow)

### 2.1 Dealer resolution at API boundary (shared)

- **Single helper** (e.g. `src/lib/api/resolve-dealer.ts` or in a shared middleware/helper):
  - **Primary:** From `Request`: Host header → normalize → `OrganizationDomain` (VERIFIED) → Organization. If found, dealer resolved.
  - **Fallback:** Query param or header (e.g. `x-dealer-slug` or `?dealerSlug=`) in **approved** contexts (e.g. only for public GET or when slug is explicitly allowed for that route). Do **not** accept `organizationId` from client.
- Every v1 public handler runs this at the start; all downstream calls use resolved `organizationId` (or 404 if not resolved).

### 2.2 `/v1/public/dealers`

- **Input:** Dealer resolved from request (domain or slug).
- **Internal:** `getOrganizationById(resolved.id)` or existing org from resolver; select only public-safe fields (name, slug, branding, homepage, canonical domain). No internal notes, subscription details, or admin-only fields.
- **Returns:** DTO: `{ name, slug, branding, homepage, canonicalDomain }` (+ metadata primitives). 404 if dealer not resolved or suspended.

### 2.3 `/v1/public/catalog`

- **List:** GET; query params for filters (make, maxPrice, minYear, sort, search). Dealer from boundary. Call `getPublicInventory(organizationId, filters)`, `getPublicMakes(organizationId)` (or single list endpoint). Return vehicles as public DTOs: slug/id, year, make, model, trim, price, mileage, drivetrain, primary image URL, etc. No internal notes, no admin-only fields, no raw workflow state. LISTED-only already enforced in lib.
- **VDP:** GET `/v1/public/catalog/[vehicleIdOrSlug]` or similar. Dealer from boundary. Resolve vehicle by **slug** when Vehicle has slug; else by **id** with `organizationId` (vehicle must belong to dealer). Call `getPublicVehicleDetail(organizationId, id)`. Return full public vehicle DTO + media URLs (full URLs), SEO-capable fields. 404 if dealer or vehicle missing or not LISTED.

### 2.4 `/v1/public/leads`

- **POST only.** Body: vehicle identity (slug or id), contact fields, message, honeypot/token.
- **Dealer:** Resolved at boundary only. **Ignore** any `organizationId` in body.
- **Validation:** Resolve vehicle by slug (or id) **scoped to resolved dealer**. If vehicle not found or not LISTED, 400/404.
- **Internal:** Call same pipeline as `submitInquiryAction` (inquiry + ensureLeadForInbound + notify + audit) with server-resolved org and vehicle. No new logic — thin wrapper.

### 2.5 `/v1/public/reservations`

- **POST only.** Body: vehicle identity (slug or id), contact fields. **No organizationId in body.**
- **Dealer:** Resolved at boundary only.
- **Validation:** Resolve vehicle by slug/id **scoped to resolved dealer**, LISTED. If unavailable, 400/409.
- **Internal:** Call same core as `initiateVehicleReservationAction` but pass **only server-resolved** `organizationId` (and vehicleId, contact). Create deal/deposit/PaymentIntent in core; return clientSecret and dealId for client-side Stripe confirm. Payment authority stays in core; webhook unchanged.

### 2.6 `/v1/auth-bridge`

- **Redirect-based.** Query: e.g. `returnUrl`, optional `dealerSlug`. Resolve dealer if needed for branding. Redirect to existing login or register URL (platform or dealer-scoped) with safe return URL (allowlist/validation). No password or session issuance in API — core handles login/register and sets cookie; redirect back to returnUrl.

### 2.7 DTO shapes (summary)

- **Dealer:** `{ name, slug, branding, homepage, canonicalDomain }` — permission-trimmed, no internal ids as primary identity in response (slug is fine).
- **Vehicle list item:** `{ id, slug? }, year, make, model, trim, price, mileage, drivetrain, batteryRangeEstimate, primaryImageUrl, exteriorColor, …` — no internalNotes, no vehicleStatus in response (or only “listed” equivalent).
- **Vehicle detail:** Same as list + full media array (full URLs), description, features, highlights, canonical URL for VDP.
- **Lead submit:** No DTO (POST); response 201 + optional `{ success: true }`.
- **Reservation initiate:** Response `{ clientSecret, dealId }` (and success/error). No internal deal/vehicle ids as primary in responses if we can avoid it; clientSecret and dealId are needed for Stripe and redirect.

---

## 3. Risk & Gap List

### 3.1 Tenant resolution

- **Gap:** Dealer resolution is **not** centralized for API. It exists in proxy (domain → slug) and in pages (slug from route params). API has no route params; resolution must be explicit at request boundary (Host or approved slug param/header).
- **Risk:** If each handler implements its own resolution, behavior may diverge (e.g. one accepts slug, another doesn’t). Canon: “Must NOT be scattered across components.”
- **Mitigation:** Introduce a single **resolve dealer from request** helper used by all v1 public handlers. Document it as the only way to get dealer context for API.

### 3.2 Storefront bypasses API

- **Gap:** Storefront calls internal libs and server actions directly: `getPublicInventory`, `getPublicVehicleDetail`, `getFeaturedInventory`, `getPublicMakes`, `submitInquiryAction`, `initiateVehicleReservationAction`, `submitVehicleRequestAction`. No use of `/v1/public/*` yet.
- **Risk:** Two paths for same operations; storefront stays privileged; canon “Storefront must become API client #1” not met.
- **Mitigation:** Treat as technical debt. Plan: add API first; then migrate storefront to call API (same as external sites). Do not remove or break existing server actions until storefront is migrated.

### 3.3 Public write safety

- **Reservations:** `initiateVehicleReservationAction` accepts `organizationId` in payload. For API, handler must **resolve dealer from request** and pass that into a core function that **does not** read organizationId from client. Either add an overload/internal that takes only (vehicleId, contact, resolvedOrgId) or have API handler strip organizationId and set it from resolved dealer.
- **Vehicle requests:** `submitVehicleRequestAction` trusts client `organizationId`. For any public “request vehicle” via API, dealer must be resolved at boundary and client `organizationId` ignored.
- **Leads (inquiry):** Already safe — org from vehicle. API must still resolve dealer and validate vehicle belongs to that dealer before calling same pipeline.

### 3.4 Webhook duplication

- **Gap:** Two Stripe webhook route files:
  - `src/app/api/stripe/webhook/route.ts` — `payment_intent.succeeded` (deposits).
  - `src/app/api/webhooks/stripe/route.ts` — `checkout.session.completed`, subscription, invoice (billing).
- Both use `STRIPE_WEBHOOK_SECRET`. Stripe allows one endpoint per secret (or multiple endpoints with same/different secrets). So either one URL receives all events and must delegate by type, or two URLs with two secrets (partitioned). Currently “ownership” is split by file but single secret implies one URL in production — **ambiguous**.
- **Mitigation:** Canon: “Stripe webhook ownership must be singular or explicitly partitioned.” Decide: (A) single webhook route that handles both payment_intent and billing events and delegates, or (B) two endpoints with two secrets and document partition. Do not add a third path; do not change behavior of deposit completion without explicit approval.

### 3.5 Vehicle identity (slug vs id)

- **Gap:** Canon: public vehicle identity is **slug** (primary), vehicleId (fallback). Schema: Vehicle has **no slug** today; storefront uses vehicle `id` in URLs (`/inventory/[id]`).
- **Risk:** If API exposes only id, external clients depend on internal id. Adding slug later could break contract if not versioned.
- **Mitigation:** For v1, API can accept **id** as vehicle identifier (fallback). When Vehicle gets a `slug` field, add slug support (e.g. resolve by slug when slug present, else by id); keep v1 contract stable (id still valid). Do not rewrite core inventory logic.

---

## 4. Minimal Implementation Plan (non-breaking)

### Principles

- **No rewrites** of core inventory, lead pipeline, deal/payment state machine, auth, VIN, or storage.
- **Layer only:** API routes are thin: resolve dealer → validate → call existing libs/actions with server-resolved context.
- **No breaking changes** to existing storefront or admin flows. Same actions and libs continue to work; API is an additional consumer.

### Order (canon)

1. `/v1/public/dealers`
2. `/v1/public/catalog`
3. `/v1/public/leads`
4. `/v1/public/reservations`
5. `/v1/auth-bridge`

### Steps (minimal)

1. **Central dealer resolution for API**
   - Add `src/lib/api/resolve-dealer.ts` (or equivalent): from `Request`, resolve Organization (domain-first, then slug fallback). Return `{ organization, organizationId }` or null. No client `organizationId` or body input.
   - Use this in all v1 public handlers.

2. **Implement `/v1/public/dealers`**
   - GET; resolve dealer; return public DTO (branding, homepage, canonical domain, name, slug). 404 if unresolved or suspended.

3. **Implement `/v1/public/catalog`**
   - GET list: resolve dealer → `getPublicInventory(organizationId, filters)` (and makes if needed) → map to public DTOs (no internal notes, full media URLs). Enforce LISTED-only (already in lib).
   - GET detail: resolve dealer → resolve vehicle by id (and later slug) scoped to dealer → `getPublicVehicleDetail(organizationId, id)` → public DTO.

4. **Implement `/v1/public/leads`**
   - POST: resolve dealer; validate vehicle (slug or id) belongs to dealer and is LISTED; call existing inquiry pipeline (e.g. `submitInquiryAction` or extracted core) with **only** server-resolved org/vehicle. Reject any body.organizationId. Add rate limit + honeypot/token (canon abuse protection).

5. **Harden reservation for API**
   - Without changing existing `initiateVehicleReservationAction` signature for storefront: add internal function or overload that takes `(resolvedOrganizationId, vehicleId, contact)` and no client org. API POST `/v1/public/reservations`: resolve dealer; validate vehicle; call that internal path. Existing action can keep accepting org from storefront (server-rendered context) until storefront migrates to API.

6. **Implement `/v1/public/reservations`**
   - POST: resolve dealer; validate vehicle; call reservation core with resolved org only; return clientSecret, dealId. Rate limit + optional bot protection.

7. **Implement `/v1/auth-bridge`**
   - Redirect to login/register with validated return URL; no new auth logic.

8. **Abuse protection (canon)**
   - Add rate limiting (per IP and per dealer) and basic bot protection (honeypot or token) for public endpoints; optional API/site key for write endpoints. Can be middleware or per-route; apply to all v1 public.

9. **Webhook clarification**
   - Document or refactor so Stripe webhook ownership is singular or explicitly partitioned; no duplicate handling of `payment_intent.succeeded`; no change to deposit completion behavior without explicit approval.

10. **Storefront migration (later)**
    - After API is stable, migrate storefront to call `/v1/public/*` instead of direct lib/actions. Then storefront becomes “API client #1” and no longer bypasses boundaries. Do not do this in the same change set as adding the API.

### What we do not do (protection zone)

- Do not rewrite: core inventory logic, lead pipeline and side effects, deal/payment state machine, auth/session system, VIN decoding, storage/media resolution.
- Do not add new endpoint groups outside the five canon groups.
- Do not expose internal CRUD or internal ids as primary in public payloads.
- Do not trust client-provided `organizationId` in any public API handler.
- Do not resolve vehicle without dealer scope.

### Public boundary vs internal derivation

**Rule:** The **public contract** is dealer-scoped at the request boundary (resolver + vehicle validation). Internal actions that derive org from vehicle (e.g. `submitInquiryAction` resolving org from `vehicle.organizationId`) are **implementation detail**, not the public trust model. Anyone bypassing the API must not rely on that; the only canonical public trust is boundary resolution.

---

## 5. Final rule (guard)

**If any change risks breaking leads, reservations, inventory, or auth:**

- **STOP**
- **FLAG IT**
- Do not merge until the risk is removed or explicitly accepted.

This document is the baseline for implementation. All implementation must align with [VEHICLIX_WEBSITE_INTEGRATION_API_V1_CANON.md](./VEHICLIX_WEBSITE_INTEGRATION_API_V1_CANON.md).
