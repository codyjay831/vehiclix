# Phase 1 Outcome Report — `UNPUBLISHED` vehicle status

## Executive summary

| Field | Value |
|--------|--------|
| **Status** | **PASS** |
| **Confidence** | High for schema + admin workflow wiring; deploy confidence depends on running `prisma migrate deploy` on each environment. |
| **Main risks** | Duplicate migration folder existed briefly in repo history; removed so only `20260404130000_vehicle_status_unpublished` applies. PostgreSQL `ALTER TYPE ... ADD VALUE` is one-way (permanent). |
| **Recommended next step** | Proceed to **Phase 2** (readiness computation, Draft → Unpublished prompt, stricter unpublished vs published thresholds). |

---

## 1. Objective

Introduce the `UNPUBLISHED` `VehicleStatus` safely, align admin labeling (`LISTED` → “Published”), enforce the normal workflow **DRAFT → UNPUBLISHED → LISTED** (no direct **DRAFT → LISTED**), keep **only `LISTED` public**, and avoid exposing `UNPUBLISHED` through storefront or public APIs—without breaking deal-driven `RESERVED` / `SOLD` / `ARCHIVED` behavior.

---

## 2. Scope implemented

**In scope (Phase 1)**

- Prisma `VehicleStatus` enum includes `UNPUBLISHED` (between `DRAFT` and `LISTED` in schema source order).
- SQL migration adds PostgreSQL enum value `UNPUBLISHED` after `DRAFT`.
- `VEHICLE_STATUS_LABELS`: Draft, Unpublished, **Published** (for `LISTED`), plus existing labels for other states.
- `updateVehicleStatusAction`: `UNPUBLISHED` in manually manageable statuses; **blocks** `DRAFT → LISTED`; **allows** `UNPUBLISHED → LISTED` with existing placeholder-price guard; `ARCHIVED → LISTED` unchanged.
- `createVehicleAction`: rejects `LISTED` on create; only `DRAFT` or `UNPUBLISHED` accepted.
- `VehicleForm` (create): primary CTA renamed **Save as Unpublished** (`UNPUBLISHED`); removed create-time “publish” validation tied to `LISTED`.
- `AdminInventoryTable`: **Unpublished** tab; badge handling for `UNPUBLISHED`; row actions **Move to Unpublished** / **Publish to showroom** (from `UNPUBLISHED`).
- Admin vehicle detail: **Public View** enabled only when `vehicleStatus === "LISTED"`; otherwise disabled control with explanatory `title`; public href prefers `slug` with `id` fallback.

**Intentionally deferred**

- Readiness tiers (unpublished vs published), Draft → Unpublished **suggestion** dialog, inventory UX overhaul beyond an extra tab, listing draft model, full canonical publish validation (photos/description on server for `LISTED`) — **Phase 2+ / Phase 6**.

---

## 3. Files changed

| Path | Change |
|------|--------|
| `prisma/schema.prisma` | **Modified** — `UNPUBLISHED` in `enum VehicleStatus`. |
| `prisma/migrations/20260404130000_vehicle_status_unpublished/migration.sql` | **New** — `ALTER TYPE "VehicleStatus" ADD VALUE 'UNPUBLISHED' AFTER 'DRAFT';` |
| `prisma/migrations/20260404143000_vehicle_status_unpublished/` | **Removed** — duplicate migration directory/file (would double-apply enum change). |
| `src/types/enums.ts` | **Modified** — labels + `UNPUBLISHED`, `LISTED` → “Published”. |
| `src/actions/inventory.ts` | **Modified** — status action + create guards + `isPublishing` fix for `tsc`. |
| `src/components/admin/AdminInventoryTable.tsx` | **Modified** — tab, filter, badges, menu actions. |
| `src/components/admin/VehicleForm.tsx` | **Modified** — create buttons/toast/validation. |
| `src/app/(admin)/admin/inventory/[id]/page.tsx` | **Modified** — conditional Public View + slug-first URL. |
| `docs/implementation/inventory-listing-overhaul/phase-1-outcome.md` | **New** — this report. |

**Not changed (verified)**

- `src/lib/inventory.ts` and all public catalog/detail paths remain **`vehicleStatus: "LISTED"`** only.
- `src/lib/api/*` public DTOs unchanged (still describe live listings).
- `src/actions/deal.ts`, `src/actions/payment.ts`, Stripe webhook: still use `LISTED` / `RESERVED` / `SOLD` as before.

---

## 4. Schema / data / migration changes

- **Enum:** `VehicleStatus` = `DRAFT`, `UNPUBLISHED`, `LISTED`, `RESERVED`, `UNDER_CONTRACT`, `SOLD`, `ARCHIVED`.
- **Migration:** single `ALTER TYPE ... ADD VALUE ... AFTER 'DRAFT'`.
- **Backfill:** none; existing rows keep current status; no row is auto-set to `UNPUBLISHED`.
- **Permanent note:** Enum values cannot be removed trivially in PostgreSQL; `UNPUBLISHED` is a permanent workflow state.

---

## 5. Behavior changes

**Admin**

- New inventory tab **Unpublished**.
- **Draft** rows: quick action **Move to Unpublished** (not direct publish).
- **Unpublished** rows: **Publish to showroom** → `LISTED`.
- Create vehicle: **Save as Unpublished** instead of **Publish Vehicle**.
- **Public View** on vehicle detail only when **Published** (`LISTED`).

**Status transitions**

- `DRAFT → LISTED` via `updateVehicleStatusAction`: **rejected** with guidance to use Unpublished first.
- `UNPUBLISHED → LISTED`: allowed (placeholder price rule preserved).
- `createVehicleAction` with `LISTED`: **rejected**.

**Public / API**

- No change: non-`LISTED` vehicles remain absent from public catalog and LISTED-only queries.

---

## 6. Why this approach was chosen

- **Enum + migration** is the source of truth; Prisma Client and TS stay aligned.
- **Server-side** blocks on create and on status action remove the main bypass (table “publish” + create form) without waiting for Phase 6-only work.
- **Admin-only** label map change keeps a single `VEHICLE_STATUS_LABELS` used in admin surfaces; `LISTED` as “Published” matches locked canon.
- **Disabled Public View** for non-live stock avoids implying a working customer URL for drafts/unpublished vehicles.
- **Slug-first** public URL matches existing public resolution behavior.

**Tradeoffs**

- Create path never emits `vehicle.published` activity (always `vehicle.created` for new rows); publishing is reflected when status moves to `LISTED` via status action (existing audit on status change).
- `UNPUBLISHED` and `DRAFT` both use `outline` badge variant in the table—Phase 3 can refine visual hierarchy.

---

## 7. Risks considered

| Risk | Mitigation |
|------|------------|
| Public leak of `UNPUBLISHED` | Public queries unchanged; grep verified LISTED-only reads. |
| Deal flow regression | `RESERVED` / `SOLD` / cancel → `LISTED` untouched. |
| Double enum migration | Removed duplicate migration folder `20260404143000_*`. |
| TypeScript drift after guards | `isPublishing` set to `false` with comment so `status` narrowing does not produce impossible comparison. |
| `AFTER 'DRAFT'` unsupported on old PG | Project targets modern PostgreSQL; if an environment failed, would need migration variant (out of scope unless reported). |

**Remaining**

- Full **canonical** validation for `LISTED` (photos, description, etc.) still centralized in Phase 6; `UNPUBLISHED → LISTED` currently only enforces non-placeholder price on server.

---

## 8. Validation performed

| Check | Result |
|--------|--------|
| `npx prisma generate` | Pass |
| `npm run typecheck` (`tsc --noEmit`) | Pass |
| `npx tsx scripts/guards/prisma-enum-migrations-sync.ts` | Pass |
| `npm run lint` | **Fails repo-wide** with many pre-existing errors; **no Phase 1 requirement to clean entire tree**. |
| `npm run build` | Not run (optional; typecheck sufficient for Phase 1 gate). |
| `prisma migrate deploy` | **Not executed** in this session (no guarantee local DB migrated). |

**Manual flows (recommended for reviewer)**

1. `npx prisma migrate dev` (or deploy) on a dev DB → confirm enum contains `UNPUBLISHED`.
2. Create vehicle: Draft vs Unpublished; confirm no direct create-as-`LISTED`.
3. Draft → Move to Unpublished → Publish to showroom; confirm public page only when `LISTED`.
4. Open Public View on unpublished: control disabled + tooltip.

---

## 9. Acceptance criteria check

| Criterion | Result |
|-----------|--------|
| Add `UNPUBLISHED` to Prisma `VehicleStatus` | **Pass** |
| Safe migration | **Pass** (single migration; duplicate removed) |
| Labels: Draft / Unpublished / Published (`LISTED`) | **Pass** |
| Badge / filter / switch updates for new status | **Pass** (admin table + detail badge via shared labels) |
| Only `LISTED` public | **Pass** (no public code changes required) |
| No public API / DTO exposure of unpublished as “live” | **Pass** |
| Reserved / sold / archive logic preserved | **Pass** |
| Normal workflow DRAFT → UNPUBLISHED → LISTED; block DRAFT → LISTED | **Pass** |
| Hide/disable Public View unless `LISTED` | **Pass** |

---

## 10. Follow-up items

- **Phase 2:** Readiness model (blocking vs warning; unpublished vs published thresholds); Draft → Unpublished prompt when draft crosses unpublished readiness.
- **Phase 3:** Replace “Active” grouping with Published / In deals / etc.; row-level next-step hints.
- **Phase 6:** Single server module for “may transition to `LISTED`” validation; align `UNPUBLISHED → LISTED` with same rules as any other path to `LISTED`.

---

## 11. Reviewer notes

- Pay attention to **migration ordering** on shared environments: only `20260404130000_vehicle_status_unpublished` should exist for this change.
- Confirm **no** second migration re-adding `UNPUBLISHED` is merged from other branches.
- Deals page still shows **raw** `vehicleStatus` enum string in one badge (`deal.vehicle.vehicleStatus`); consider switching to `VEHICLE_STATUS_LABELS` in a later polish pass (optional).
- `isPublishing` in `createVehicleAction` is always `false`; the `if (isPublishing)` revalidate block is effectively dead—harmless, could be removed in a small cleanup.
