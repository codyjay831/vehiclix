# 12 — MVP Acceptance Scenarios

## 1. Purpose

This document provides a structured set of acceptance test scenarios for the Evo Motors MVP. Each test case verifies that a specific user journey works end-to-end, covering UI behavior, data integrity, state transitions, and edge cases.

These scenarios should be used by engineering to validate implementation and by QA to verify release readiness.

---

## 2. Test Conventions

* **Test IDs** follow the format `[DOMAIN]-[NUMBER]` (e.g., `INV-001`).
* **Preconditions** describe required system state before the test runs.
* **Steps** are numbered, explicit user actions.
* **Expected Results** describe what the user sees AND what the database reflects.
* **Records Validated** list the entities and fields that should be verified.

---

## 3. Seed Data Requirements

Tests assume the following seed data exists:

| Seed Item | Details |
|-----------|---------|
| Owner account | Email: `owner@evomotors.com`, 2FA enabled, authenticated |
| Customer account (verified) | Email: `buyer@example.com`, email verified, password set |
| Customer account (stub) | Email: `stub@example.com`, no password, created from prior inquiry |
| Vehicle — Draft | VIN: `DRAFT00000000001`, status: Draft, no photos |
| Vehicle — Listed (complete) | VIN: `LIST000000000001`, status: Listed, 5 photos, description filled, price $45,000 |
| Vehicle — Listed (second) | VIN: `LIST000000000002`, status: Listed, make: Rivian, price $72,000 |
| Vehicle — Reserved | VIN: `RESV000000000001`, status: Reserved, linked to active Deal for `buyer@example.com` |
| Vehicle — Sold | VIN: `SOLD000000000001`, status: Sold |
| VehicleInquiry — New | Linked to `LIST000000000001`, from `stub@example.com`, status: New |
| VehicleRequest — Submitted | From `buyer@example.com`, make: Tesla, model: Model Y, status: Submitted |
| Deal — Deposit Received | Linked to `RESV000000000001` and `buyer@example.com` |

---

## 4. Owner Inventory Workflows

### INV-001: Owner Can Create a Draft Vehicle

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Owner is authenticated. No vehicle exists with VIN `NEW0000000000001`. |
| **Steps** | 1. Navigate to `/admin/inventory/new`. 2. Fill in VIN: `NEW0000000000001`, Year: 2024, Make: Tesla, Model: Model 3, Trim: Long Range, Mileage: 5000, Drivetrain: AWD, Exterior: White, Interior: Black, Condition: Excellent, Title: Clean, Price: $38,000. 3. Leave description, highlights, and photos empty. 4. Click "Save Draft." |
| **Expected Result** | Toast: "Vehicle saved as draft." URL updates to `/admin/inventory/[new-id]/edit`. Vehicle appears in admin inventory list with status badge "Draft." Vehicle does NOT appear on public `/inventory`. |
| **Records Validated** | Vehicle record exists with `vehicleStatus = DRAFT`, all entered fields match input. |

---

### INV-002: Owner Cannot Publish with Missing Required Fields

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Draft vehicle `DRAFT00000000001` exists with no photos and no description. |
| **Steps** | 1. Navigate to `/admin/inventory/[draft-id]/edit`. 2. Click "Publish." |
| **Expected Result** | Page scrolls to first validation error. Inline errors appear: "Description is required to publish" and "At least one photo is required to publish." Vehicle status remains Draft. No toast. |
| **Records Validated** | Vehicle `vehicleStatus` is still `DRAFT`. |

---

### INV-003: Owner Can Upload Photos and Set a Primary Image

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Draft vehicle exists. |
| **Steps** | 1. Navigate to vehicle edit page. 2. Drag 3 JPEG files into the photo upload zone. 3. Wait for all uploads to complete (progress bars reach 100%). 4. Click the star icon on the second photo. 5. Click "Save." |
| **Expected Result** | Three photos appear in the grid. Second photo shows a filled star (primary). After save, toast: "Changes saved." Reloading the page shows the same order and primary selection. |
| **Records Validated** | Three VehicleMedia records exist with correct `vehicleId`. `displayOrder` reflects the visual order. The record with `displayOrder = 0` (primary) corresponds to the second uploaded photo. |

---

### INV-004: Owner Can Publish a Valid Vehicle

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Draft vehicle with all required fields filled, description written, and at least 1 photo uploaded. |
| **Steps** | 1. Navigate to vehicle edit page. 2. Verify all required fields are filled. 3. Click "Publish." |
| **Expected Result** | Toast: "Vehicle published and live on the site." Vehicle appears on public `/inventory` with correct card data (photo, make/model, price). Vehicle detail page is accessible at `/inventory/[slug]`. Admin inventory list shows status "Listed." |
| **Records Validated** | Vehicle `vehicleStatus = LISTED`. ActivityEvent exists with `eventType = vehicle.published`. |

---

### INV-005: Owner Can Edit a Published Vehicle

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Listed vehicle `LIST000000000001` exists. |
| **Steps** | 1. Navigate to `/admin/inventory/[id]/edit`. 2. Change price from $45,000 to $43,500. 3. Click "Save Changes." |
| **Expected Result** | Toast: "Changes saved." The public VDP for this vehicle now shows $43,500. Admin list shows updated price. |
| **Records Validated** | Vehicle `price = 43500`. ActivityEvent exists with `eventType = vehicle.updated`, metadata includes `changedFields: ["price"]`. |

---

### INV-006: Owner Can Mark a Vehicle as Reserved

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Listed vehicle `LIST000000000001` exists. |
| **Steps** | 1. Navigate to admin inventory list. 2. Click the action menu for the vehicle. 3. Click "Mark Reserved." 4. Confirmation dialog appears: "Reserve this vehicle?" 5. Click "Confirm." |
| **Expected Result** | Toast: "Marked reserved." Vehicle status badge changes to "Reserved." Vehicle no longer appears on public `/inventory`. VDP returns "This vehicle is no longer available." |
| **Records Validated** | Vehicle `vehicleStatus = RESERVED`. ActivityEvent with `eventType = vehicle.reserved`. |

---

### INV-007: Owner Can Mark a Reserved Vehicle as Sold

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Reserved vehicle `RESV000000000001` exists with linked Deal. |
| **Steps** | 1. Navigate to vehicle edit or deal detail. 2. Progress vehicle through Under Contract → Sold. (Mark Under Contract first, then Mark Sold.) 3. Confirm each dialog. |
| **Expected Result** | Vehicle status is "Sold." Linked Deal status is "Completed." Vehicle is accessible in admin with "Sold" badge but not on public site. |
| **Records Validated** | Vehicle `vehicleStatus = SOLD`. Deal `dealStatus = COMPLETED`. ActivityEvents for `vehicle.under_contract`, `vehicle.sold`, `deal.status_changed`. |

---

### INV-008: Owner Can View Linked Inquiries on a Vehicle

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Vehicle `LIST000000000001` has at least one VehicleInquiry linked to it. |
| **Steps** | 1. Navigate to `/admin/inventory/[id]/edit`. 2. Look for an "Inquiries" section or link. 3. Click to view linked inquiries. |
| **Expected Result** | A list of inquiries linked to this vehicle is displayed, showing customer name, email, date, and status. Clicking an inquiry navigates to `/admin/inquiries/[id]`. |
| **Records Validated** | VehicleInquiry records with matching `vehicleId` are displayed. |

---

### INV-009: Owner Can Unpublish a Listed Vehicle

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Listed vehicle exists with no active reservation. |
| **Steps** | 1. Navigate to vehicle edit page. 2. Click "Unpublish." 3. Confirm dialog. |
| **Expected Result** | Toast: "Vehicle unpublished." Status returns to Draft. Vehicle is removed from public inventory. All data is preserved in admin. |
| **Records Validated** | Vehicle `vehicleStatus = DRAFT`. ActivityEvent with `eventType = vehicle.unpublished`. |

---

### INV-010: Owner Cannot Unpublish a Vehicle with Active Reservation

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Vehicle `RESV000000000001` is Reserved with an active deal. |
| **Steps** | 1. Navigate to vehicle edit page. 2. Attempt to click "Unpublish" (should not be available) OR if available, attempt the action. |
| **Expected Result** | "Unpublish" option is either hidden or disabled for Reserved vehicles. If the action is somehow triggered, server returns error: "This vehicle has an active reservation." |
| **Records Validated** | Vehicle status remains RESERVED. |

---

## 5. Customer Browsing Workflows

### BRW-001: Customer Can Browse Inventory Cards

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | At least 2 Listed vehicles exist. |
| **Steps** | 1. Navigate to `/inventory`. |
| **Expected Result** | A grid of vehicle cards is displayed. Each card shows: primary photo, year/make/model, price, mileage, battery range (if available), drivetrain badge. Each card has a "View Details" button. Only Listed vehicles appear. Draft, Reserved, Sold, and Archived vehicles are absent. |
| **Records Validated** | N/A (read-only). |

---

### BRW-002: Customer Can Filter Inventory and See Matching Results

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Listed vehicles include a Tesla at $45,000 and a Rivian at $72,000. |
| **Steps** | 1. Navigate to `/inventory`. 2. Set price range max to $50,000. |
| **Expected Result** | Only the Tesla card is shown. Result count updates: "1 vehicle." The Rivian is filtered out. URL updates to include `?priceMax=50000`. |
| **Records Validated** | N/A (read-only). |

---

### BRW-003: Filters Persist on Page Refresh

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Filters have been applied (e.g., make=Tesla). |
| **Steps** | 1. Apply a filter (make: Tesla). 2. Verify URL includes `?make=Tesla`. 3. Refresh the browser. |
| **Expected Result** | After refresh, the filter is still active, URL still includes `?make=Tesla`, and only Tesla vehicles are shown. |

---

### BRW-004: Empty Inventory State

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Zero vehicles are in Listed status. |
| **Steps** | 1. Navigate to `/inventory`. |
| **Expected Result** | Empty state message: "Our inventory is being updated." with a CTA: "Request a Vehicle" linking to `/request-vehicle`. No broken grid or loading spinner left on screen. |

---

### BRW-005: No-Results Filter State

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Listed vehicles exist but none match the applied filters. |
| **Steps** | 1. Navigate to `/inventory`. 2. Set make filter to a make with no vehicles (e.g., "Lucid" if none exist). |
| **Expected Result** | Message: "No vehicles match your filters." "Clear all filters" link. Secondary CTA: "Request a Vehicle." |

---

### BRW-006: Customer Can Open Vehicle Detail Page

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Listed vehicle `LIST000000000001` exists with 5 photos. |
| **Steps** | 1. Navigate to `/inventory`. 2. Click "View Details" on the vehicle card. |
| **Expected Result** | VDP loads at `/inventory/[slug]`. Hero image displays (primary photo). Thumbnail strip shows all 5 photos. Vehicle facts display correctly (year, make, model, mileage, drivetrain, range, colors, condition, title status). Price is prominent. Description and highlights render. Action buttons are visible: "Reserve with Deposit", "Ask About This Vehicle", "Have a Trade-In?", "Need Financing?" |

---

### BRW-007: VDP for Unavailable Vehicle Shows Graceful Message

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Vehicle was previously Listed but is now Reserved or Sold. |
| **Steps** | 1. Navigate directly to the vehicle's VDP URL. |
| **Expected Result** | Page shows: "This vehicle is no longer available." CTA: "Browse Current Inventory" → `/inventory`. No raw 404 page. No broken layout. |

---

## 6. Inquiry Workflows

### INQ-001: Customer Can Submit Inquiry Successfully

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Listed vehicle exists. |
| **Steps** | 1. Navigate to vehicle VDP. 2. Click "Ask About This Vehicle." 3. Fill in: First Name: "Jane", Last Name: "Doe", Email: "jane@example.com", Phone: "5551234567", Contact: "Email", Message: "Is this vehicle still available?" 4. Click "Send Inquiry." |
| **Expected Result** | Spinner on button during submission. Modal transitions to success view: "Thanks, Jane!" with confirmation message. |
| **Records Validated** | VehicleInquiry created with `vehicleId` matching the vehicle, `customerName = "Jane Doe"`, `customerEmail = "jane@example.com"`, `inquiryStatus = NEW`. Stub Customer record created with email `jane@example.com` (if not already existing). ActivityEvent with `eventType = inquiry.submitted`. |

---

### INQ-002: Customer Sees Validation on Incomplete Inquiry Form

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Listed vehicle exists. |
| **Steps** | 1. Open inquiry modal. 2. Leave all fields empty. 3. Click "Send Inquiry." |
| **Expected Result** | Inline validation errors appear under required fields: "First name is required", "Last name is required", "Email is required", "Phone is required", "Please select a contact method." Form does not submit. No records created. |

---

### INQ-003: Duplicate Inquiry Updates Existing Record

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | VehicleInquiry exists for `jane@example.com` on vehicle `LIST000000000001`, submitted within last 24 hours. |
| **Steps** | 1. Navigate to VDP for `LIST000000000001`. 2. Click "Ask About This Vehicle." 3. Fill in same email (`jane@example.com`) with a new message: "Also interested in the range details." 4. Submit. |
| **Expected Result** | Success view appears normally. The existing VehicleInquiry record is updated — the new message is appended. No duplicate inquiry record is created. |
| **Records Validated** | Only one VehicleInquiry exists for this email + vehicle combination. Message field contains both the original and new message. |

---

### INQ-004: Owner Can Review and Respond to Inquiry

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | VehicleInquiry exists with status New. |
| **Steps** | 1. Navigate to `/admin/inquiries`. 2. Verify the inquiry appears with status "New." 3. Click "View." 4. Read customer message and vehicle details. 5. Click "Mark Reviewed." 6. Add owner note: "Will follow up via phone." 7. Click "Save Note." 8. Click "Mark Responded." |
| **Expected Result** | After "Mark Reviewed": toast appears, status badge updates to "Reviewed." After "Save Note": toast "Note saved." note appears in the activity section. After "Mark Responded": toast appears, status badge updates to "Responded." |
| **Records Validated** | VehicleInquiry `inquiryStatus = RESPONDED`. `ownerNotes` contains the note text. ActivityEvents for `inquiry.reviewed` and `inquiry.responded`. |

---

### INQ-005: Owner Can Convert Inquiry to Deal

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | VehicleInquiry exists (status: New or Reviewed). Linked vehicle is Listed. |
| **Steps** | 1. Navigate to inquiry detail. 2. Click "Convert to Deal." 3. Modal opens with pre-filled customer and vehicle data. 4. Verify purchase price ($45,000). 5. Select initial status: "Lead." 6. Click "Create Deal." |
| **Expected Result** | Toast: "Deal created." Modal closes. Inquiry detail page shows status "Converted" with a link to the new deal. |
| **Records Validated** | Deal created with `vehicleId`, `customerId`, `dealStatus = LEAD`, `purchasePrice = 45000`. VehicleInquiry `inquiryStatus = CONVERTED`. ActivityEvents for `inquiry.converted` and `deal.created`. |

---

## 7. Deposit and Reservation Workflows

### DEP-001: Customer Can Reserve an Available Vehicle

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Listed vehicle `LIST000000000001` exists. Stripe test mode enabled. |
| **Steps** | 1. Navigate to VDP. 2. Click "Reserve with Deposit." 3. Page loads at `/inventory/[slug]/reserve`. 4. Fill in: First Name, Last Name, Email, Phone. 5. Check agreement checkbox. 6. Enter Stripe test card `4242 4242 4242 4242`. 7. Click "Place Deposit — $500." |
| **Expected Result** | Button shows spinner: "Processing..." After payment succeeds, redirect to `/reservation/[dealId]/confirmation`. Success page shows: "Your [Vehicle] is Reserved!" with reservation summary, deposit amount, confirmation number, and "Create Your Account" CTA. |
| **Records Validated** | Deal with `dealStatus = DEPOSIT_RECEIVED`. DealDeposit with `paymentStatus = SUCCEEDED`, `depositAmount = 500`. Vehicle `vehicleStatus = RESERVED`. Stub Customer created (if new email). ActivityEvents: `deal.created`, `deposit.initiated`, `deposit.completed`, `vehicle.reserved`. |

---

### DEP-002: Customer Cannot Reserve an Already Reserved Vehicle

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Vehicle `RESV000000000001` is already Reserved. |
| **Steps** | 1. Navigate directly to `/inventory/[slug]/reserve` for the reserved vehicle. |
| **Expected Result** | Page shows: "This vehicle was just reserved by another customer." CTA: "Browse Other Vehicles" → `/inventory`. No payment form is displayed. |

---

### DEP-003: Concurrent Reservation Attempt is Blocked

| Field | Value |
|-------|-------|
| **Role** | Two anonymous visitors simultaneously |
| **Preconditions** | Listed vehicle exists. |
| **Steps** | 1. Both visitors load the reserve page for the same vehicle. 2. Visitor A submits payment first. 3. Visitor B submits payment second. |
| **Expected Result** | Visitor A: payment succeeds, sees confirmation. Visitor B: before PaymentIntent is created, server checks vehicle status (now Reserved), returns error: "This vehicle was just reserved by another customer." Visitor B is NOT charged. |
| **Records Validated** | Only one Deal and one DealDeposit exist for this vehicle. Vehicle has exactly one reservation. |

---

### DEP-004: Failed Payment Does Not Reserve the Vehicle

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Listed vehicle exists. |
| **Steps** | 1. Navigate to reserve page. 2. Fill in all fields. 3. Enter Stripe test declined card `4000 0000 0000 0002`. 4. Click "Place Deposit." |
| **Expected Result** | Inline error: "Your card was declined. Please try a different payment method." Vehicle remains Listed. No deal or deposit records are finalized. |
| **Records Validated** | No Deal with `DEPOSIT_RECEIVED` exists. DealDeposit may exist with `paymentStatus = FAILED`. Vehicle `vehicleStatus` remains `LISTED`. |

---

### DEP-005: Post-Deposit Success Page Shows Correct Data

| Field | Value |
|-------|-------|
| **Role** | Customer who just completed deposit |
| **Preconditions** | Deposit just succeeded. |
| **Steps** | 1. Arrive at `/reservation/[dealId]/confirmation`. |
| **Expected Result** | Page displays: vehicle year/make/model, deposit amount, date, confirmation number (deal ID or friendly reference), next steps (create account, upload documents, contract signing), support contact info. "Create Your Account" button is prominent. |

---

### DEP-006: Deposit Appears in Owner Admin

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Customer just completed a deposit. |
| **Steps** | 1. Navigate to `/admin/deals`. |
| **Expected Result** | New deal appears with status "Deposit Received." Clicking the deal shows: customer info, vehicle info, deposit amount, payment confirmation, and deal timeline. Vehicle status shows "Reserved" in inventory. |

---

## 8. Vehicle Request Workflows

### REQ-001: Customer Can Submit "Find Me This Car" Request

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | None. |
| **Steps** | 1. Navigate to `/request-vehicle`. 2. Fill in: Make: Tesla, Model: Model Y, Year Min: 2022, Year Max: 2024, Max Mileage: 30000, Budget: $55,000, Timeline: "Within 1 month", First Name: "Alex", Last Name: "Kim", Email: "alex@example.com", Phone: "5559876543." 3. Click "Submit Request." |
| **Expected Result** | Redirect to `/request-vehicle/confirmation`. Confirmation page shows: "Request Received!" with summary of desired vehicle and next-step expectations. |
| **Records Validated** | VehicleRequest created with `requestStatus = SUBMITTED`, all fields matching input. Stub Customer created for `alex@example.com`. ActivityEvent: `request.submitted`. |

---

### REQ-002: Vehicle Request Appears in Owner Dashboard

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | VehicleRequest exists with status Submitted. |
| **Steps** | 1. Navigate to `/admin/requests`. |
| **Expected Result** | Request appears in list with customer name, desired make/model, budget, and status "Submitted." Clicking opens detail view with all submitted preferences. |

---

### REQ-003: Owner Can Progress Request Through Statuses

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | VehicleRequest exists with status Submitted. |
| **Steps** | 1. Open request detail. 2. Click "Mark Under Review." 3. Add note: "Checking auction inventory." 4. Click "Save Note." 5. Click "Mark Sourcing." |
| **Expected Result** | Status progresses: Submitted → Under Review → Sourcing. Notes persist. Toast confirmations appear for each action. |
| **Records Validated** | VehicleRequest `requestStatus = SOURCING`. Owner notes contain the added note. ActivityEvents: `request.reviewed`, `request.sourcing_started`. |

---

### REQ-004: Owner Can Create and Send a Proposal

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | VehicleRequest exists with status Sourcing. |
| **Steps** | 1. On request detail page, click "Add Proposal." 2. Fill in: Make: Tesla, Model: Model Y, Year: 2023, Mileage: 18000, Estimated Price: $48,500, Notes: "Clean Carfax, one owner." 3. Click "Send Proposal." |
| **Expected Result** | Toast: "Proposal sent to customer." Proposal appears in the request's proposals section. Request status changes to "Vehicle Proposed." |
| **Records Validated** | VehicleProposal created with `proposalStatus = PROPOSED` and correct field values. VehicleRequest `requestStatus = VEHICLE_PROPOSED`. ActivityEvent: `proposal.created`. |

---

### REQ-005: Customer Can Accept a Proposal

| Field | Value |
|-------|-------|
| **Role** | Customer (authenticated) |
| **Preconditions** | Customer has a VehicleRequest with a Proposed VehicleProposal. |
| **Steps** | 1. Navigate to `/portal/requests/[id]`. 2. View the proposal details. 3. Click "Accept." |
| **Expected Result** | Proposal status changes to "Accepted." Request status changes to "Customer Approved." Confirmation message: "You've accepted this proposal. Our team will be in touch with next steps." |
| **Records Validated** | VehicleProposal `proposalStatus = CUSTOMER_ACCEPTED`. VehicleRequest `requestStatus = CUSTOMER_APPROVED`. ActivityEvent: `proposal.accepted`. |

---

### REQ-006: Owner Can Convert Approved Request to Deal

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | VehicleRequest with status Customer Approved. |
| **Steps** | 1. Navigate to request detail. 2. Create a Vehicle record from the proposal data (or link to an existing vehicle). 3. Click "Convert to Deal." 4. Confirm deal creation. |
| **Expected Result** | Deal created linking customer and vehicle. Request status → "Converted to Deal." Toast: "Converted to deal." Customer can now see the deal in their portal and proceed to deposit. |
| **Records Validated** | Deal created with `dealStatus = LEAD` or `DEPOSIT_PENDING`. VehicleRequest `requestStatus = CONVERTED_TO_DEAL`. ActivityEvents: `request.converted`, `deal.created`. |

---

## 9. Trade-In and Financing Workflows

### TRD-001: Customer Can Submit Trade-In Information

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Listed vehicle exists. |
| **Steps** | 1. Navigate to VDP. 2. Click "Have a Trade-In?" 3. Fill in: Year: 2019, Make: Nissan, Model: Leaf, Mileage: 45000, Condition: Good. 4. Add name and email. 5. Click "Submit Trade-In Info." |
| **Expected Result** | Modal shows success: "Thanks! We'll review your trade-in details." |
| **Records Validated** | TradeInCapture created with all fields. `vehicleId` matches the VDP vehicle. ActivityEvent: `tradein.submitted`. |

---

### TRD-002: Customer Can Submit Financing Interest

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor |
| **Preconditions** | Listed vehicle exists. |
| **Steps** | 1. Navigate to VDP. 2. Click "Need Financing?" 3. Fill in: Name, Email, Phone, Credit Score Range: "Good (700-749)." 4. Click "Submit." |
| **Expected Result** | Modal shows success: "We've noted your interest in financing." |
| **Records Validated** | VehicleInquiry created (or updated) with `financingInterest = true`. ActivityEvent: `financing_interest.submitted`. |

---

## 10. Cross-System Workflows

### XSY-001: Inquiry Creates and Links a Lead Record

| Field | Value |
|-------|-------|
| **Role** | Anonymous visitor → Owner |
| **Preconditions** | Listed vehicle. No prior Customer record for `newlead@example.com`. |
| **Steps** | 1. Visitor submits inquiry with email `newlead@example.com`. 2. Owner navigates to `/admin/inquiries`, views the inquiry. 3. Owner clicks "Convert to Deal." |
| **Expected Result** | Stub Customer exists for `newlead@example.com`. Deal is created and linked to both the stub customer and the vehicle. |
| **Records Validated** | Customer record with `email = newlead@example.com`, `passwordHash = null`. Deal linked to customer and vehicle. VehicleInquiry linked to vehicle. |

---

### XSY-002: Deposit Success Updates Reservation and Vehicle Status

| Field | Value |
|-------|-------|
| **Role** | System (Stripe webhook) |
| **Preconditions** | Deal exists with `dealStatus = DEPOSIT_PENDING`. DealDeposit with `paymentStatus = PENDING`. Vehicle with `vehicleStatus = LISTED`. |
| **Steps** | 1. Stripe sends `payment_intent.succeeded` webhook. |
| **Expected Result** | DealDeposit → `SUCCEEDED`. Deal → `DEPOSIT_RECEIVED`. Vehicle → `RESERVED`. |
| **Records Validated** | All three records updated atomically. ActivityEvents: `deposit.completed`, `vehicle.reserved`. |

---

### XSY-003: Failed Payment Does Not Change Vehicle Status

| Field | Value |
|-------|-------|
| **Role** | System (Stripe webhook) |
| **Preconditions** | Deal with `DEPOSIT_PENDING`. Vehicle `LISTED`. |
| **Steps** | 1. Stripe sends `payment_intent.payment_failed` webhook. |
| **Expected Result** | DealDeposit → `FAILED`. Deal remains `DEPOSIT_PENDING` or moves to `CANCELLED`. Vehicle remains `LISTED` — NOT reserved. |
| **Records Validated** | Vehicle `vehicleStatus = LISTED`. No `vehicle.reserved` event. |

---

### XSY-004: Activity Log Records Major Actions

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Multiple actions have been performed: vehicle created, inquiry submitted, deal created. |
| **Steps** | 1. Navigate to a deal detail page in admin. 2. Check the activity log section. |
| **Expected Result** | Chronological list shows all relevant events: deal.created, deposit.completed, vehicle.reserved, etc. Each entry shows timestamp, event type, and actor. |

---

### XSY-005: Stub Customer Upgrades on Account Creation

| Field | Value |
|-------|-------|
| **Role** | Customer |
| **Preconditions** | Stub Customer exists for `stub@example.com` with linked inquiry and deposit. |
| **Steps** | 1. Navigate to `/register`. 2. Register with email `stub@example.com` and a password. 3. Verify email (if required). 4. Log into `/portal`. |
| **Expected Result** | Portal shows the existing deal (from deposit) and inquiry history. All prior records are accessible. Customer did NOT lose any data from the stub phase. |
| **Records Validated** | Customer `passwordHash` is now set. `emailVerified = true`. All linked Deal, VehicleInquiry records are intact. |

---

### XSY-006: Cancelled Deal Returns Vehicle to Listed

| Field | Value |
|-------|-------|
| **Role** | Owner |
| **Preconditions** | Deal with `DEPOSIT_RECEIVED`. Vehicle `RESERVED`. |
| **Steps** | 1. Navigate to deal detail in admin. 2. Cancel the deal. 3. Confirm dialog. |
| **Expected Result** | Deal → `CANCELLED`. Vehicle → `LISTED`. Vehicle reappears on public `/inventory`. |
| **Records Validated** | Deal `dealStatus = CANCELLED`. Vehicle `vehicleStatus = LISTED`. ActivityEvents: `deal.cancelled`, `vehicle.reservation_released`. |

---

## 11. Smoke Test Order

Run these tests in order for a minimal end-to-end validation before release:

| Order | Test ID | Description |
|-------|---------|-------------|
| 1 | INV-001 | Owner creates a draft vehicle |
| 2 | INV-003 | Owner uploads photos |
| 3 | INV-004 | Owner publishes the vehicle |
| 4 | BRW-001 | Customer sees vehicle in inventory |
| 5 | BRW-006 | Customer opens VDP |
| 6 | INQ-001 | Customer submits inquiry |
| 7 | INQ-004 | Owner reviews inquiry |
| 8 | DEP-001 | Customer reserves with deposit |
| 9 | DEP-002 | Second customer cannot reserve same vehicle |
| 10 | REQ-001 | Customer submits vehicle request |
| 11 | REQ-004 | Owner sends proposal |
| 12 | REQ-005 | Customer accepts proposal |
| 13 | XSY-005 | Stub customer upgrades to full account |

---

## 12. High-Risk Flows

These flows carry the highest risk of bugs or data inconsistency:

| Flow | Risk | Mitigation |
|------|------|------------|
| Deposit payment + status update | Payment succeeds but DB update fails | Idempotent webhook handler + daily reconciliation job |
| Concurrent reservation | Two users reserve same vehicle | Server-side vehicle status check before PaymentIntent creation |
| Stub → full customer upgrade | Data loss during merge | Email-based identity resolution; no data deletion on upgrade |
| Vehicle status transitions with active deals | Status desync between Vehicle and Deal | Deal drives vehicle status; block manual vehicle status changes when deal is active |
| Photo upload partial failure | Inconsistent gallery state | Independent uploads; retry per file; save accepts partial success |

---

## 13. MVP Launch Checklist

### Data & Infrastructure
- [ ] PostgreSQL database provisioned and migrated
- [ ] Prisma schema matches canon entities
- [ ] Seed data loaded (owner account, sample vehicles)
- [ ] S3 or equivalent storage configured for uploads
- [ ] Stripe webhook endpoint registered and verified
- [ ] DocuSign webhook endpoint registered

### Owner Flows
- [ ] Owner can log in with 2FA
- [ ] Owner can CRUD vehicles (create, edit, publish, unpublish, delete draft)
- [ ] Owner can upload and manage photos
- [ ] Owner can change vehicle status through full lifecycle
- [ ] Owner can view and manage inquiries
- [ ] Owner can convert inquiry to deal
- [ ] Owner can view and manage vehicle requests
- [ ] Owner can create and send proposals
- [ ] Owner can view deals and progress them through states
- [ ] Owner can view trade-in submissions
- [ ] Owner can view activity logs

### Customer Flows
- [ ] Inventory page loads with correct vehicles
- [ ] Filters work and persist via URL
- [ ] VDP renders correctly with gallery and action buttons
- [ ] Inquiry submission works with validation
- [ ] Deposit/reservation flow works end-to-end with Stripe
- [ ] Concurrency protection prevents double-reservation
- [ ] Vehicle request form works with confirmation
- [ ] Customer can create account and access portal
- [ ] Portal shows deal status and milestone tracker
- [ ] Customer can accept/decline proposals

### Edge Cases
- [ ] Empty inventory shows graceful state
- [ ] Unavailable vehicle VDP shows graceful message
- [ ] Failed payment does not reserve vehicle
- [ ] Duplicate inquiry handling works
- [ ] Stub customer upgrade preserves all data

### Security
- [ ] Owner routes protected by 2FA middleware
- [ ] Customer routes isolated by user ID
- [ ] File uploads stored in private storage with signed URLs
- [ ] Stripe webhook signature verification active
- [ ] CSRF protection on all state-changing endpoints
- [ ] Rate limiting on auth and submission endpoints
