# Phase 2 Outcome Report — Readiness system + transition logic

## Executive summary

| Field | Value |
|--------|--------|
| **Status** | **PASS** |
| **Confidence** | High. Readiness logic is deterministic and integrated into key admin flows. |
| **Main risks** | Minimal. Readiness is computed dynamically on the client/server without persisting state, ensuring it always reflects current data. |
| **Recommended next step** | Proceed to **Phase 3** (Inventory page overhaul - workflow tabs, indicators, action refinement). |

---

## 1. Objective

Add a deterministic readiness computation system to distinguish between "ready for unpublished" (`UNPUBLISHED`) and "ready for showroom" (`LISTED`). Use this system to prompt users to move `DRAFT` vehicles to `UNPUBLISHED` when they become complete enough, and surface readiness status throughout the admin interface.

---

## 2. Scope implemented

**In scope (Phase 2)**

- **Readiness Engine:** Created `src/lib/vehicle-readiness.ts` with tiered logic (blocking unpublished, blocking showroom, and quality warnings).
- **Draft → Unpublished Prompt:** Integrated readiness check into `VehicleForm` (edit mode). After saving a `DRAFT`, if it's "ready for unpublished," a dialog prompts the user to move it to `UNPUBLISHED`.
- **List View Indicators:** Added a "Readiness" column to `AdminInventoryTable` with icon-based status and detail tooltips (using native `title` for simplicity and performance).
- **Detail View Indicators:** Added a prominent "Listing Readiness" card to the vehicle detail page for `DRAFT` and `UNPUBLISHED` vehicles, showing exactly what's missing or recommended.
- **Workflow Enforcement:** Transition to `UNPUBLISHED` from the prompt uses the `updateVehicleStatusAction`.

**Intentionally deferred**

- Automated "AI-based" scoring (remains grounded/deterministic).
- Persisting readiness state in DB (currently computed on-the-fly for maximum accuracy).
- Refined workflow tabs (Phase 3).

---

## 3. Files changed

| Path | Change |
|------|--------|
| `src/lib/vehicle-readiness.ts` | **New** — Core readiness computation logic. |
| `src/components/admin/VehicleForm.tsx` | **Modified** — Added transition logic and readiness prompt dialog. |
| `src/components/admin/AdminInventoryTable.tsx` | **Modified** — Added readiness column and status indicators. |
| `src/app/(admin)/admin/inventory/[id]/page.tsx` | **Modified** — Added readiness card and next-step CTA. |
| `docs/implementation/inventory-listing-overhaul/phase-2-outcome.md` | **New** — This report. |

---

## 4. Schema / data / migration changes

- **None.** This phase relied on purely functional logic applied to existing data models.

---

## 5. Behavior changes

**Admin workflow**

- Users editing a `DRAFT` vehicle will now see a prompt after saving if the vehicle is ready for review.
- The inventory table now explicitly shows how many issues/warnings each vehicle has, helping staff prioritize work.
- The vehicle detail page provides a clear "Listing Readiness" checklist for incomplete vehicles.

**Status transitions**

- New automated prompt path: `DRAFT` (Save) → Readiness Check → Prompt → `UNPUBLISHED`.

---

## 6. Why this approach was chosen

- **Deterministic Logic:** Avoids "AI hallucinations" by using strict field-based checks (VIN length, placeholder values, photo counts).
- **On-the-fly Computation:** Ensures readiness always reflects the latest edits without requiring complex DB sync or migrations.
- **Progressive Disclosure:** Uses tooltips in the list view to keep the UI clean while providing deep detail on hover.
- **Actionable CTAs:** The detail page doesn't just show issues; it provides a direct path to resolve them.

---

## 7. Risks considered

| Risk | Mitigation |
|------|------------|
| UI Clutter | Used a "Readiness" column instead of a separate card per row; tooltips handle the "why." |
| Performance | Readiness computation is lightweight (scalar checks + small array maps); safe for list views. |
| Workflow Friction | The prompt is only shown when a vehicle *becomes* ready, and users can choose to "Stay in Draft." |

---

## 8. Validation performed

| Check | Result |
|--------|--------|
| `npm run typecheck` | Pass |
| Manual Flow: Create placeholder draft | Blocking issues correctly identified (VIN, Price, Photos). |
| Manual Flow: Edit draft to completion | Prompt correctly appears after save. |
| Manual Flow: View inventory list | Readiness indicators show correct issue counts and tooltips. |

---

## 9. Acceptance criteria check

| Criterion | Result |
|-----------|--------|
| Add readiness computation system | **Pass** |
| Support blocking (unpublished vs showroom) and warnings | **Pass** |
| Draft -> Unpublished prompt when complete | **Pass** |
| Surface readiness in list and detail views | **Pass** |
| Logic grounded and deterministic | **Pass** |

---

## 10. Follow-up items

- **Phase 3:** Complete inventory page overhaul (tabs for Published, Unpublished, In deals, etc.).
- **Phase 6:** Server-side enforcement of showroom readiness during status transition.
