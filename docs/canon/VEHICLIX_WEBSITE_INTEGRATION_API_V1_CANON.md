# Vehiclix Website Integration API v1 — CANON DOC

---

## 0. PURPOSE

Vehiclix will expose a **Website Integration API v1** that allows:

- Vehiclix storefront
- Dealer custom websites
- Future integrations

to consume Vehiclix as a backend engine **WITHOUT**:

- duplicating logic
- introducing new authority layers
- breaking tenant isolation
- creating multiple inconsistent paths

This API is a **thin integration surface** over existing core logic, not a new system.

---

## 1. CORE PRINCIPLE

### Vehiclix Core = ONLY Authority

The following domains are **exclusively owned by Vehiclix core**:

- Vehicles (inventory, status, pricing)
- Media + document URLs
- VIN-derived data
- Leads + CRM pipeline
- Reservation + deal + payment state
- Auth/session issuance
- Dealer/account/tenant scoping

**Never delegated to:**

- Storefront
- Dealer websites
- External integrations

---

## 2. API SURFACE (LOCKED)

Vehiclix Website Integration API v1 consists of **exactly**:

| Endpoint Group | Path |
|----------------|------|
| Catalog | `/v1/public/catalog` |
| Leads | `/v1/public/leads` |
| Reservations | `/v1/public/reservations` |
| Dealers | `/v1/public/dealers` |
| Auth Bridge | `/v1/auth-bridge` |

### Rules

- No additional endpoint groups in v1
- No dealer-specific variations
- No direct exposure of internal CRUD
- No "temporary" alternate paths

---

## 3. IDENTITY POLICY (LOCKED)

### Dealer Resolution

- **Primary:** domain-based
- **Fallback:** `dealerSlug`
- Must be resolved at request boundary

### Vehicle Identity

- **Public:** `slug` (primary)
- **Internal:** `vehicleId` (fallback only)

### Critical Rule

> **No vehicle may be resolved without dealer scoping.**

---

## 4. STOREFRONT RULE (CRITICAL)

### Storefront has ZERO authority

Storefront is:

- a presentation layer
- a consumer of the API

Storefront must **NOT**:

- call internal server actions directly
- query internal libs directly for public data
- bypass API boundaries
- rely on privileged access unavailable to external sites

### Requirement

**Storefront must become API client #1.**

Until then, it is considered transitional technical debt.

---

## 5. PUBLIC BOUNDARY RULES

All public API responses must be:

- dealer-scoped
- public-safe
- permission-trimmed
- consistent across endpoints
- metadata-capable

### Forbidden in public payloads

- internal notes
- raw workflow state
- admin-only fields
- hidden inventory states
- internal IDs as primary identity

### Public API Authentication & Abuse Protection

All public endpoints must include:

- Rate limiting per IP and per dealer
- Basic bot protection (honeypot or token)
- Optional API key / site key for write endpoints

**Purpose:** Prevent spam/lead flooding, protect dealer data integrity, maintain system stability at scale.

---

## 6. MODULE RULES

### A. Catalog (`/v1/public/catalog`)

- **Read-only**
- **Provides:** inventory listing, vehicle detail (VDP), metadata primitives
- **Must:**
  - return full media URLs
  - use slug-based identity
  - enforce LISTED-only visibility
  - include SEO-capable data

### B. Leads (`/v1/public/leads`)

- **Write-only (create)**
- **Must:**
  - validate dealer scope at boundary
  - never trust client-provided `organizationId`
  - route through core lead pipeline

### C. Reservations (`/v1/public/reservations`)

- **Controlled write**
- **Must:**
  - validate availability in core
  - create deal/deposit via core
  - never expose payment authority externally

### D. Dealers (`/v1/public/dealers`)

- **Read-only**
- **Provides:** branding, homepage config, canonical domain, metadata primitives

### E. Auth Bridge (`/v1/auth-bridge`)

- **Redirect-based flow**
- **Must:**
  - never expose password auth externally
  - keep session issuance in core
  - support return URL safely

---

## 7. TENANT RESOLUTION (CRITICAL)

### Must be centralized

Dealer resolution must:

- run at request boundary
- support domain-first
- fallback to slug only in approved contexts

### Must NOT

- be scattered across components
- rely on client-provided org identifiers
- vary per endpoint

---

## 8. PUBLIC WRITE HARDENING RULE

All public writes **MUST**:

- resolve dealer context internally
- validate vehicle belongs to dealer
- reject mismatched context
- ignore client-provided authority fields

### Forbidden

- trusting `organizationId` from client
- resolving by `vehicleId` alone
- bypassing dealer scope

---

## 9. METADATA POLICY

**Vehiclix provides:**

- canonical base/domain
- vehicle metadata primitives
- primary image
- structured data fields

**Website/storefront provides:**

- title
- meta description
- OG tags
- JSON-LD
- canonical tag

### Canonical rule

- One canonical domain per dealer
- Non-canonical hosts must not compete in SEO

---

## 10. DUPLICATION PREVENTION RULE

Vehiclix must **NOT** allow:

- multiple business paths for same operation
- duplicated reservation logic
- duplicated lead creation paths
- multiple webhook ownership ambiguity
- multiple dealer resolution paths

### Specific enforcement

- Stripe webhook ownership must be singular or explicitly partitioned
- Catalog logic must not be duplicated across layers

---

## 11. VERSIONING RULE

- API is versioned (`/v1/`)
- Breaking changes require new version
- No silent contract changes

---

## 12. SCALE RULE

All dealer variation must be:

- **configuration-driven**
- not code-driven
- not endpoint-driven

### Forbidden

- dealer-specific API forks
- custom logic per dealer in integration layer

---

## 13. DO NOT TOUCH (PROTECTION ZONE)

The following systems must **NOT** be rewritten during API v1:

- core inventory logic
- lead pipeline and side effects
- deal/payment state machine
- auth/session system
- VIN decoding system
- storage/media resolution

---

## 14. IMPLEMENTATION STRATEGY

### Order (LOCKED)

1. `/v1/public/dealers`
2. `/v1/public/catalog`
3. `/v1/public/leads`
4. `/v1/public/reservations`
5. `/v1/auth-bridge`

### Requirements before rollout

- storefront migrated to API consumption
- tenant resolution centralized
- public write boundaries hardened
- webhook duplication resolved

---

## 15. SUCCESS CRITERIA

Vehiclix API v1 is successful when:

- storefront uses the same API as external websites
- no business logic exists outside core
- no duplicate paths exist
- dealer websites can integrate without special access
- system remains stable and non-breaking

---

## 16. FINAL CANON STATEMENT

**Vehiclix is an API-first dealership engine.**

- The core system owns all authority
- The API is the only integration surface
- All websites are consumers
- No consumer is privileged

---

## CANON STATUS

This document is now:

- **locked**
- **non-negotiable**
- **baseline for scripts and implementation**
