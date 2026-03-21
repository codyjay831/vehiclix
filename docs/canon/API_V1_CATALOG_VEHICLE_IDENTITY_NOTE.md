# API v1 Catalog — Vehicle Identity (Canon Precondition Note)

**Status: PRECONDITION RESOLVED** (after migration + backfill)

## Canon expectation

Per `VEHICLIX_WEBSITE_INTEGRATION_API_V1_CANON.md`:

- **Public vehicle identity:** slug (primary), vehicleId (fallback only).
- No vehicle may be resolved without dealer scoping.

## Schema (resolved)

The `Vehicle` model has a **`slug`** field (nullable, unique per organization via `@@unique([organizationId, slug])`). Existing vehicles are backfilled via `scripts/backfill-vehicle-slugs.ts`; new vehicles get a slug at create time. Public catalog detail uses slug-primary lookup with id fallback.

## Implications (resolved)

- Slug is the primary public identity; id is fallback only. Lookup is dealer-scoped, slug-first.
- The detail route path is still `/api/v1/public/catalog/[vehicleId]`; the segment accepts slug or id. **Behavior is correct and backward-compatible.** The segment name itself is a later cleanup item; contract behavior matters more than the file name.

---

## Locked execution state (Triangle Mode verdict)

**Rule:** Catalog detail is **canon-aligned** once migration and backfill are applied.

| Endpoint | Status |
|----------|--------|
| `/v1/public/dealers` | **Approved** |
| `/v1/public/catalog` (list) | **Approved** |
| `/v1/public/catalog/[vehicleId]` (detail) | **Approved** once migration + backfill are applied. Slug-primary lookup, id fallback. |

- The detail endpoint uses `getPublicVehicleDetailBySlugOrId(organizationId, slugOrId)`: slug is tried first, then id. DTOs expose real `slug` when present.

### Rollout preconditions (before treating as fully live)

1. Apply migration `20260317000000_add_vehicle_slug`.
2. Run `scripts/backfill-vehicle-slugs.ts`.
3. Run `npx prisma generate` if types are stale.
4. Verify a few real vehicles per dealer resolve by slug, not just id.

### Later cleanup (optional)

- Rename route segment from `[vehicleId]` to something like `[vehicleSlug]` for clarity; behavior stays slug-first with id fallback.
