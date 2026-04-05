# Evo Motors Deals: UX Flow Spec

## Staff Experience (Admin Dashboard)

The Staff flow centers around the **Deal Jacket** concept—a single view for everything related to a vehicle sale.

### 1. Entry Points
- **Vehicle Detail**: "Start Deal" button (primary action).
- **Inventory Row**: "Create Deal" context menu action.
- **Lead Detail**: "Convert to Deal" button.
- **Customer Profile**: "New Deal" button.

### 2. Guided Creation Wizard (The "Deal Starter")
When a Staff member initiates a deal, they enter a multi-step modal or dedicated page:

- **Step 1: Identify Buyer**
  - Search by Name/Email/Phone.
  - "Create New Customer" stub (Name, Email, Phone).
- **Step 2: Confirm Vehicle**
  - Show VIN, Year/Make/Model, and Current List Price.
  - "Lock Inventory" checkbox (defaults to ON).
- **Step 3: Define Terms**
  - **Negotiated Price**: Pre-filled from Vehicle but editable.
  - **Dealer Fees**: Pre-filled from Org defaults.
  - **Government Fees/Taxes**: Placeholders for now.
  - **Deposit Amount**: Required (defaults to Org minimum).
- **Step 4: Select Payment Path**
  - Radio toggle: [Cash | Outside Finance | Dealer-Arranged Finance].
- **Finish**: Redirect to the **Deal Jacket**.
  - **Draft Locking**: A `DRAFT` deal provides an internal soft-lock / warning for other staff. It does NOT remove the vehicle from the public inventory site.
  - **Committed Locking**: Once the deal moves to `DEPOSIT_PENDING` or `DEPOSIT_RECEIVED`, the vehicle is publicly locked/reserved and removed from the active catalog.

### 3. The Deal Jacket (Deal Detail Page)
A redesigned detail view featuring a **Progress Tracker** and **Task Checklist**.

- **Header**: VIN, Buyer Name, Status Badge, and "Clear to Release" indicator.
- **Left Column: The Task List** (Branch-Aware)
  - **Common**: ID Upload, Insurance Upload.
  - **Cash Path**: "Verify Funds (Wire/ACH)" task.
  - **Outside Finance**: "Lender Info" task, "Approval Letter" upload.
  - **Dealer Finance**: "Credit App" link, "Lender Response" tracker, "Stipulations" list.
- **Right Column: Commercials**
  - Price, Fees, Taxes, Total.
  - Deposit Status (Stripe payment link or manual mark-as-paid).
  - Final Balance Due.
- **Bottom: Document Control**
  - Generate Purchase Agreement (PDF).
  - DocuSign Integration (Send for Signatures).

### 4. The Delivery Gate & Manager Overrides
Once all checklist items are checked:
- Button: "Release for Delivery" becomes active.
- Clicking updates Deal to `READY_FOR_DELIVERY`.
- Vehicle status remains `UNDER_CONTRACT` (it is NOT marked `SOLD` yet).

**Manager Overrides**:
- Authorized Managers see an "Override" option on blocked milestones (e.g., "Bypass Funds Verification").
- Clicking requires a mandatory "Reason" comment.
- Overrides are visually flagged in the Deal Jacket.

### 5. Final Handoff & Funding Lifecycle
When the vehicle is physically delivered to the customer (Handoff):
- Staff mark the deal as `DELIVERED`.
- **Vehicle status moves to `SOLD`** at this exact point.
- The Deal Jacket remains open in a `DELIVERED` state for finalization.
- **Funding Tracker**: For finance deals, staff track the transition to `COMPLETED` once funds are received from the lender.
- **Trade/Title Follow-up**: Checklist for "Trade Payoff Sent" and "Title/Reg Filed" remains active until `COMPLETED`.

---

## Future Customer Experience (Mobile Task Portal)

The Customer's experience is a simplified, mobile-first task list accessible via a secure, unguessable link.

### 1. Welcome Screen
- "Congratulations on your [Year Make Model]!"
- Overview of steps: "Confirm Info", "Upload Docs", "Final Signature".

### 2. Task List (Tesla-style)
- **Identity**: Take a photo of Driver's License.
- **Insurance**: Upload insurance card or binder.
- **Financing**: (If Dealer Finance) Complete Credit Application.
- **Trade-In**: (If Trade) Upload photos and VIN.
- **Signatures**: (If Business Buyer) Authorized signer verification.
- **Final Payment**: Submit ACH/Bank info or instructions for Wire/Cashier's Check.

### 3. E-Sign
- Direct link to DocuSign envelope from the portal.

### 4. Delivery Scheduling
- Select a pickup or delivery date after "Clear to Release" status is achieved.

---

## Edge Cases & Error States
- **Vehicle Already in Deal**: If a VIN is already locked in another active deal, show "Vehicle Unavailable" with a link to the existing deal.
- **Customer Creation Conflict**: If a stub user is created with an email that already exists, prompt to merge or select the existing user.
- **Payment Path Change**: Staff can change the payment path mid-deal. This triggers a checklist refresh (e.g., switching from Cash to Finance adds the "Credit App" requirement).
- **Vehicle Swap**: (Phase 2) Staff can "Swap Vehicle" in the Deal Jacket. This releases the current asset and requires re-confirming snapshotted terms for the new VIN.
- **Inventory Edit Drift**: If the price of the vehicle is updated in the Inventory editor, a warning appears in the Deal Jacket: "List price changed. Re-snapshot deal terms?"
