# Phase 3 Outcome Report — Inventory Page Overhaul

## Executive summary

| Field | Value |
|--------|--------|
| **Status** | **PASS** |
| **Confidence** | High. The inventory table now explicitly follows the approved workflow. |
| **Main risks** | Minimal UI churn. Users will need to adjust to the new tab structure. |
| **Recommended next step** | Proceed to **Phase 4** (Vehicle detail page UX overhaul - hierarchy and sections). |

---

## 1. Objective

Overhaul the admin inventory list page to reflect the new canonical workflow. Replace the overloaded "Active" grouping with explicit stages (Draft, Unpublished, Published, etc.), add clear next-step guidance for every vehicle, and ensure all table actions respect the workflow rules.

---

## 2. Scope implemented

**In scope (Phase 3)**

- **Workflow Tabs:** Replaced current tabs with:
  - **Published:** `LISTED` vehicles (true public inventory).
  - **Unpublished:** `UNPUBLISHED` vehicles (internal review).
  - **Draft:** `DRAFT` vehicles (incomplete).
  - **In Deals:** `RESERVED` and `UNDER_CONTRACT` vehicles.
  - **Sold / Archived / All:** Preserved existing terminal states.
- **Next Action Column:** Added a new column that determines the primary next step based on status and readiness:
  - `DRAFT` + Ready → **Move to Unpublished** button.
  - `DRAFT` + Not Ready → **Complete Details** link.
  - `UNPUBLISHED` + Ready → **Publish to Showroom** button.
  - `UNPUBLISHED` + Not Ready → **Fix Issues to Publish** link.
  - `PUBLISHED` → **Live on Site** indicator.
- **Action Refinement:**
  - **Share Menu:** Disabled "Copy Link" and "Open Listing" for non-published vehicles.
  - **Row Actions:** Grouped status changes into "Move to Unpublished," "Publish to Showroom," "Demote to Draft," etc., with readiness guards on the buttons.
- **UI Polish:** Updated tab styling for better visibility and narrowed the "Active" tab logic to only show live inventory.

**Intentionally deferred**

- Bulk actions (remain as single-row for now).
- Persistent sorting by readiness score.

---

## 3. Files changed

| Path | Change |
|------|--------|
| `src/components/admin/AdminInventoryTable.tsx` | **Modified** — Reworked tabs, added Next Action column, refined row actions. |
| `docs/implementation/inventory-listing-overhaul/phase-3-outcome.md` | **New** — This report. |

---

## 4. Schema / data / migration changes

- **None.** Purely UI and logic refinement.

---

## 5. Behavior changes

**User-visible changes**

- The inventory dashboard now defaults to the **Published** tab instead of a mixed "Active" tab.
- Users can now see at a glance what needs to be done for any vehicle without opening it.
- Primary workflow actions (Move to Unpublished, Publish) are now one-click buttons in the table if readiness criteria are met.
- Accidental sharing of private links for drafts is now blocked in the UI.

**Workflow enforcement**

- "Move to Unpublished" is disabled if the vehicle lacks basic identification or photos.
- "Publish to Showroom" is disabled if the vehicle lacks a marketing description or real price.

---

## 6. Why this approach was chosen

- **Explicit Workflow:** By splitting the tabs, we eliminate ambiguity about what is "Active" vs "Live."
- **Actionable Rows:** Moving the primary status action into a dedicated column makes the workflow self-documenting.
- **Safety First:** Disabling public sharing for non-live items prevents "broken link" issues for customers.
- **Clean Transitions:** Adding "Demote to Draft" and "Restore to Unpublished" actions provides a complete path for editing life cycles.

---

## 7. Risks considered

| Risk | Mitigation |
|------|------------|
| Tab Overload | Used a flex-wrap container for tabs to ensure they work on smaller admin screens. |
| Action Confusion | Kept the "More Actions" menu for secondary tasks while highlighting the "Next Step" as the primary CTA. |
| Readiness Lag | Since readiness is computed on render, it always reflects the latest DB state after a refresh. |

---

## 8. Validation performed

| Check | Result |
|--------|--------|
| `npm run typecheck` | Pass |
| Manual Flow: Published Tab | Shows only `LISTED` vehicles. |
| Manual Flow: Unpublished Tab | Shows only `UNPUBLISHED` vehicles with "Publish" CTA if ready. |
| Manual Flow: Next Action | Correctly switches between "Complete Details" and "Move to Unpublished" as fields are filled. |
| Manual Flow: Share Menu | Controls disabled correctly for drafts. |

---

## 9. Acceptance criteria check

| Criterion | Result |
|-----------|--------|
| Replace tab/status grouping with workflow | **Pass** |
| Distinguish Draft, Unpublished, Published, In Deals, etc. | **Pass** |
| Add better status/readiness indicators | **Pass** |
| Improve next-step clarity in rows | **Pass** |
| Table actions respect workflow | **Pass** |
| Eliminate misleading workflow language | **Pass** |

---

## 10. Follow-up items

- **Phase 4:** Detail page overhaul to match this structure (Listing Status, Copy Workspace, Distribution).
- **Phase 6:** Unify the validation logic used in `NextActionCell` with server-side status mutation guards.
