You are now moving from documentation into implementation for the Evo Motors Deals system.

This is an execution pass.
You must implement from the approved docs package.
Do not re-plan the product from scratch.
Do not drift from canon.
Do not expand scope beyond the defined phases.
Do not “improve” the architecture by inventing new patterns that are not justified by the docs or repo realities.

Your source of truth is the approved docs package in `docs/deals/`.

---

# Mission

Implement **Phase 1A only** of the Evo Motors Deals redesign.

This is the first execution pass.
Your goal is to deliver the minimum production-safe guided deal creation flow using the existing repo structure.

You must follow the approved canon and phase boundaries exactly.

---

# Approved docs package to follow

Use these docs as source of truth:

- `docs/deals/deals-end-to-end-architecture.md`
- `docs/deals/deals-epics.md`
- `docs/deals/deals-ux-flow.md`
- `docs/deals/deals-status-model.md`
- `docs/deals/deals-data-model-evolution.md`
- `docs/deals/deals-rollout-plan.md`
- `docs/deals/deals-risks-and-anti-patterns.md`
- `docs/deals/deals-payment-and-branch-rules.md`

Important:
If repo reality conflicts with the docs in a material way, do NOT silently improvise.
Call it out clearly in your report and choose the smallest production-safe implementation that preserves canon.

---

# Locked canon you must obey

1. Deal is the parent transaction object.
2. Vehicle is attached to the deal.
3. Customer is attached to the deal.
4. One vehicle can belong to at most one ACTIVE deal at a time.
5. Vehicle must NOT become the parent of the transaction.
6. Deal owns transaction state, payment path, and commercial snapshot.
7. Commercial terms must be snapshotted on the deal, not pulled live from inventory after the deal starts.
8. Deposits and final payment are separate concepts.
9. Phase 1 should prefer reusing existing `Deal.userId` for the primary buyer if safe.
10. Do NOT rename `Deal.userId` in Phase 1 unless it is proven trivial, isolated, and low-risk.
11. `DRAFT` is internal soft-lock / warning only.
12. `DRAFT` must NOT remove the vehicle from public inventory automatically.
13. Hard/public lock begins only at committed states (`DEPOSIT_PENDING`, `DEPOSIT_RECEIVED`, or equivalent committed state consistent with current repo logic).
14. `READY_FOR_DELIVERY` does NOT mark vehicle `SOLD`.
15. Vehicle becomes `SOLD` only at actual delivery/handoff (`DELIVERED` milestone or equivalent implemented state).
16. Phase 1A must reuse the existing deal detail page as much as possible.
17. Phase 1A must NOT require a major UI redesign to count as complete.
18. Do NOT overbuild Phase 1A with Phase 1B/2/3 work.
19. Do NOT implement lender APIs, customer portal, co-buyer, business buyer, trade-in flow, vehicle swap flow, or full automation in this pass.
20. Do NOT create schema explosion in Phase 1A.

---

# Phase 1A scope you must implement

Implement only the following:

## A. Start Deal entry points
Add guided “Start Deal” entry points from:
- vehicle detail page
- inventory row/actions if practical in current repo
- optionally lead/inquiry only if repo reality makes it low-risk and already close to existing flow

Minimum required:
- vehicle detail page must support starting a deal

## B. Guided deal creation flow
Implement the minimum guided flow:
1. Start Deal
2. create/select customer
3. attach vehicle
4. choose payment path
5. snapshot commercial terms
6. save draft or early committed deal state
7. route into the existing deal detail page

This can be:
- a modal
- drawer
- dedicated page
- or minimal wizard component

Choose the smallest safe implementation that fits the current repo.

## C. Commercial snapshot on Deal
Add the minimum schema/data handling needed so a deal stores its own commercial terms.

At minimum implement the Phase 1A snapshot direction from docs:
- selling/list/negotiated price snapshot
- fee/tax snapshot fields as needed
- deposit-required snapshot if supported by docs/current logic
- paymentPath
- dealOwnerId / sourceChannel only if justified and low-risk in current repo

Use the minimum additive schema change set necessary.

## D. Customer attachment
Use the existing `Deal.userId` primary buyer relationship if repo inspection confirms it is safe.
Do not rename it in Phase 1A.
Provide the minimum create/select customer flow to attach a primary buyer to the deal.

## E. Active-deal guardrails
Enforce one-active-deal-per-vehicle using shared logic.
At minimum:
- prevent creation of a conflicting new active deal when a vehicle already has one
- show a clear error or route to the existing deal if practical
- keep the implementation centralized, not scattered

## F. Draft vs committed locking behavior
Implement or preserve these behaviors:
- `DRAFT` = internal warning / soft-lock only
- no public inventory removal on `DRAFT`
- only committed deal states trigger hard/public reservation logic
If exact public-site logic already exists elsewhere, integrate carefully instead of rewriting broadly.

## G. Minimal deal detail reuse
After creation, land on the existing deal detail page.
Add only the minimum page changes needed to show:
- primary buyer
- payment path
- snapshotted commercial terms
- any minimal new draft/creation context

Do not do a full final Deal Jacket redesign in this pass.

---

# Explicitly out of scope for this execution pass

Do NOT implement:
- dynamic checklist engine
- full branch-aware deal management
- manager override UI
- delivery gate
- outside finance milestone tracking UI beyond basic stored selection
- dealer-finance milestone tracking UI beyond basic stored selection
- co-buyer support
- business buyer support
- trade-in flow
- vehicle swap flow
- customer portal
- lender integrations
- payment rails automation
- DocuSign template automation
- KYC / ID verification integrations
- major status-engine rewrite
- global tender policy admin UI unless absolutely required for compilation/runtime correctness

You may leave careful TODO comments or docs references where appropriate, but do not build these now.

---

# Required implementation behavior

## 1. Repo-first verification
Before changing code:
- inspect the current Prisma schema
- inspect current deal actions
- inspect current payment-related actions
- inspect current deal detail page
- inspect vehicle detail page and inventory table
- inspect current lead/inquiry surfaces only if relevant
- identify existing status enums and helpers

Then implement the smallest safe changes that satisfy Phase 1A.

## 2. Minimize surface area
Prefer:
- additive schema fields
- reuse of existing pages/components/actions
- shared helper functions
- smallest viable UI additions

Avoid:
- broad rewrites
- unnecessary renames
- speculative abstractions
- duplicating existing logic

## 3. Keep status logic safe
If adding or using `DRAFT`, ensure the behavior is consistent with canon:
- soft-lock only
- not sold
- not public hard-reserved

If current repo lacks `DRAFT`, make the smallest safe adjustment consistent with the docs and current enum realities.

## 4. Preserve current working flows
Do not break:
- existing public reservation flow
- existing deal detail functionality
- existing vehicle status update behavior outside the intended Phase 1A changes

If a migration path is needed, implement it conservatively.

## 5. Transactions and safety
Use transactions where deal creation and vehicle state interaction must remain consistent.
Do not introduce status desync between Deal and Vehicle.

---

# Deliverables

Implement the code changes and then provide a final execution report in this exact structure:

# 1. Repo Truths Found
- what the repo actually contained before changes
- any material differences from docs

# 2. Files Changed
- every file changed
- one-line purpose for each

# 3. Schema Changes
- exact fields added/changed
- why each was necessary
- confirmation that rename churn was avoided

# 4. Guided Flow Implemented
- exact user flow now working
- entry points added
- how customer selection/creation works
- how payment path selection works
- how commercial snapshot works

# 5. Guardrails Implemented
- how active deal conflict prevention works
- how draft vs committed locking behaves
- what shared helper logic was added

# 6. Existing Surface Reuse
- how the existing deal detail page was reused
- what was intentionally NOT redesigned yet

# 7. Out-of-Scope Items Deferred
- explicitly list which approved-later items were not implemented

# 8. Risks / Follow-Ups
- any issues still needing Phase 1B or later
- any repo constraints discovered

# 9. Validation Performed
- typecheck/build/tests/manual path checks performed
- what passed / what was not run

# 10. Confidence
- realistic confidence, not 100%

---

# Hard rules

- Do not say “I also went ahead and…”
- Do not implement adjacent nice-to-haves
- Do not silently pull in Phase 1B/2/3 work
- Do not rename `userId`
- Do not make the vehicle `SOLD` during release-ready logic
- Do not make `DRAFT` publicly unavailable
- Do not replace existing deal detail page with a heavy redesign unless absolutely required
- Do not invent product decisions not grounded in docs or repo realities

If you are forced to choose between:
- “cleaner theoretical architecture”
and
- “smaller production-safe Phase 1A implementation consistent with docs”

choose the smaller production-safe Phase 1A implementation.