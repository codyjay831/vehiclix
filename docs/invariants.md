# SaaS Architecture Invariants & Guardrails

This document tracks technical invariants and business rules that must be maintained across the Evo Motors (Vehiclix) platform.

## 1. Tenant Routing & Isolation

- **Canonical Route Resolver**: `DealerLayout` (`src/app/(marketing)/[dealerSlug]/layout.tsx`) is the single source of truth for public tenant resolution. 
- **No Global Resolution**: Public routes must never use `searchParams.org` for tenant resolution. They must resolve the tenant via the slug and then scope all data queries to the resolved `organizationId`.
- **TenantProvider**: Public display context is propagated via `TenantProvider`. It is NOT a security boundary; server-side validation against the `organizationId` from the route/database is mandatory for all mutations and sensitive data fetches.

## 2. Reserved Slugs (Follow-up Invariant)

**CRITICAL**: No organization slug may collide with platform/system routes.

- **Reserved Keywords**: `admin`, `portal`, `login`, `register`, `api`, `inventory`, `about`, `contact`, `privacy`, `terms`, `reservation`.
- **Enforcement**: This must be enforced at the schema/validation level during organization creation/update. (Status: Pending Implementation)

## 3. Data Integrity & Isolation

- **Scoped Lookups**: Admin actions and public analytics must use `findFirst` or `updateMany` with `organizationId` in the `where` clause to ensure cross-tenant leakage is impossible.
- **Nullable Audit Logs**: `ActivityEvent.organizationId` is nullable to allow for system-level audit logs that do not belong to a specific tenant.
