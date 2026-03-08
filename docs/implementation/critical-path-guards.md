# Critical Path Guards

This document defines the 5 high-risk implementation areas for the Evo Motors platform. Failure to follow these rules will break the transactional integrity, security, or state machine of the application.

---

## The 5 Dangerous Task Groups

### 1. Prisma Schema and Status Enums
**Risk:** Every feature depends on these models. Enum drift or ad-hoc status strings break the state machine.
**Safety Rules:**
- Prisma enums MUST match canon exactly.
- TS enums/types should be generated from or mirror Prisma in one central place (`src/types/enums.ts`).
- No ad-hoc status strings in components or APIs.
- Every relation must be explicit and named cleanly.

**Preflight Prompt for AI:**
> Read the task and the canon docs for schema/state models first.
> List every model and enum you will create.
> List every status enum exactly as canon defines it.
> List any assumptions before coding.
> **Stop before coding.**

---

### 2. Vehicle Reservation and Stripe Concurrency
**Risk:** Two users reserving the same car; client-side "success" spoofing; inconsistent payment/vehicle states.
**Safety Rules:**
- Stripe is the source of truth for deposit success.
- Vehicle must be checked as `LISTED` server-side *before* creating a PaymentIntent.
- Reservation state changes happen server-side via webhooks.
- Webhook processing must be idempotent.
- Never trust client-side success callbacks alone.

**Preflight Prompt for AI:**
> Before coding, explain the exact reservation flow step by step:
> 1. client action
> 2. server action
> 3. stripe action
> 4. webhook action
> 5. database updates
> Show how double-reservation is prevented and how idempotency is handled.
> **Stop before coding.**

---

### 3. Deal Lifecycle and Vehicle/Deal Synchronization
**Risk:** Vehicles and deals drift apart (e.g., sold vehicle stays listed, cancelled deal leaves vehicle locked).
**Safety Rules:**
- `Deposit Received` reserves vehicle.
- `Completed` marks vehicle `Sold`.
- `Cancelled` reverts vehicle to `Listed` or `Archived`.
- Every status-changing endpoint MUST validate the current state.
- No direct jumping between arbitrary states.
- Deal transitions should be centralized in a service layer, not scattered in UI handlers.

**Preflight Prompt for AI:**
> List the allowed Deal state transitions and the linked Vehicle state effects.
> Then list the API/service functions where these transitions will live.
> Do not code until the transition table is shown.

---

### 4. Request → Proposal → Vehicle → Deal Conversion Chain
**Risk:** Proposals accepted without deal creation; duplicate deals; data drift between sourced vehicles and proposals.
**Safety Rules:**
- Proposal acceptance MUST update proposal state.
- Request moves to `Customer Approved` or `Converted` appropriately.
- Owner MUST create or confirm the actual Vehicle record before deal completion.
- Deal is created once, with correct customer + vehicle linkage.
- Duplicate-deal prevention is mandatory.

**Preflight Prompt for AI:**
> Show the full conversion chain for:
> VehicleRequest -> VehicleProposal -> Vehicle -> Deal
> Include which records are created, which are updated, and which IDs link them.
> Also show duplicate-prevention logic.
> **Stop before coding.**

---

### 5. Document Security and Access Control
**Risk:** Private files exposed; customers accessing other customers' docs; spoofed DocuSign completions.
**Safety Rules:**
- ALL uploads are private (no public bucket URLs).
- Access ONLY through authenticated server checks or signed URLs.
- DocuSign is the source of truth for signature completion (verify webhooks).
- Every document MUST be linked to `deal_id` and `customer_id`.
- Signed URL generation must validate ownership *every time*.

**Preflight Prompt for AI:**
> Before coding, describe:
> 1. where files are stored
> 2. how access is authorized
> 3. how signed URLs are generated
> 4. how DocuSign completion is verified server-side
> 5. how customer A is prevented from accessing customer B's files
> **Stop before coding.**

---

## Global Execution Rule for AI

For any task touching one of the areas above, use this exact command first:

**Step 1: Analysis & Plan**
> Read the task file, related epic, and related canon docs first.
> Return:
> 1. Intent restatement
> 2. Exact models/enums/statuses affected
> 3. Allowed transitions or ownership rules
> 4. Files likely touched
> 5. Risks of drift
> 6. Step-by-step implementation plan
> **Stop before coding.**

**Step 2: Implementation (After Plan Approval)**
- Implement ONLY this task.
- Do not touch unrelated files.
- If a dependency is missing, stop and report it.
- After implementation, return:
  1. Files changed
  2. What was implemented
  3. Acceptance criteria checklist
  4. Any blockers or follow-up tasks
- **Do not continue to another task.**
