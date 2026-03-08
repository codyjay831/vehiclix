# 10 — User Experience Scenarios

## 1. Design Principles

Every screen and interaction in the Evo Motors platform follows these operational principles:

* **One primary action per screen.** Secondary actions are visually de-emphasized.
* **State is visible.** Users always know where they are, what has been saved, and what is next.
* **Errors are specific.** Validation messages reference the exact field and the exact rule that failed.
* **Confirmations are proportional.** Destructive or irreversible actions require a confirmation dialog. Non-destructive saves use a toast.
* **Loading is graceful.** Skeleton loaders on data-heavy screens; inline spinners on buttons during async actions.
* **Empty states guide.** When no data exists, the screen explains what should be there and offers a CTA to create it.

---

## 2. Core Entities Referenced

These entities are defined in canon docs 04 and 05. This document adds two new lightweight entities for MVP:

| Entity | Defined In | Purpose |
|--------|-----------|---------|
| Vehicle | 04 | Core inventory record |
| VehicleMedia | 04 | Photos and video links |
| VehicleRequest | 04 | Customer sourcing request |
| VehicleProposal | 04 | Dealer proposal for a sourcing request |
| Deal | 05 | Central transaction record |
| DealDocument | 05 | Uploaded docs and contract tracking |
| DealDeposit | 05 | Stripe deposit record |
| DocuSignEnvelope | 05 | Contract signature tracking |
| EnergyServiceRequest | 06 | Baytech lead capture |
| **VehicleInquiry** | **New (this doc)** | Customer question/interest on a specific listed vehicle |
| **TradeInCapture** | **New (this doc)** | Lightweight trade-in info submitted by customer |

---

## 3. Shared UX Patterns

### 3.1 Toast Notifications
Used after non-destructive saves, publishes, and form submissions. Appears bottom-right on desktop, bottom-center on mobile. Auto-dismisses after 5 seconds. Includes an optional "Undo" action for reversible changes.

### 3.2 Confirmation Dialogs
Used before destructive or state-changing actions: marking sold, cancelling a deal, unpublishing a listing. Dialog states the action, its consequences, and offers "Cancel" (secondary) and the action verb (primary/destructive).

### 3.3 Inline Validation
Fields validate on blur. Required fields show a red border and helper text beneath the field. The submit/save button remains enabled but submission re-validates all fields and scrolls to the first error.

### 3.4 Loading States
* **Page load:** Skeleton loaders matching the page layout (cards, tables, form sections).
* **Button action:** Button shows a spinner icon, text changes to "Saving..." / "Publishing..." / "Submitting...", and is disabled until the server responds.
* **Image upload:** Progress bar per file with percentage.

### 3.5 Empty States
Every list/table view has a designed empty state:
* Illustration or icon (subtle, on-brand).
* Headline explaining what would be here.
* CTA button to create the first item.

### 3.6 Dirty State Warning
On admin forms with unsaved changes, navigating away triggers a browser-level "You have unsaved changes" dialog.

---

## 4. Owner / Admin Scenarios

---

### Scenario A — Add a Vehicle to Inventory

**Actor:** Owner
**Trigger:** Owner clicks "Add Vehicle" from the inventory list page.
**Preconditions:** Owner is authenticated with 2FA.

#### Route
`/admin/inventory/new`

#### Page Layout
Single-page form with scrollable sections. No tabs — all fields visible in a vertical flow so the owner can fill in everything in one pass. A sticky bottom bar contains the action buttons.

**Sections (top to bottom):**

1. **Vehicle Identification**
2. **Specifications**
3. **Condition & History**
4. **Pricing**
5. **Description & Highlights**
6. **Photos**
7. **Internal Notes**

#### Section 1 — Vehicle Identification
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| VIN | text (17 chars) | Yes | Exactly 17 alphanumeric characters; unique across all vehicles |
| Year | number / select | Yes | 4-digit year, min 2010, max current year + 1 |
| Make | text / select | Yes | Non-empty string |
| Model | text / select | Yes | Non-empty string |
| Trim | text | No | Free text |

*MVP Note:* VIN decode is not implemented. The owner types all fields manually. A future enhancement may auto-fill Year/Make/Model from VIN.

#### Section 2 — Specifications
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Mileage | number | Yes | Non-negative integer |
| Drivetrain | select | Yes | Options: AWD, RWD, FWD |
| Battery Range Estimate | number (miles) | No | Positive integer if provided |
| Exterior Color | text / color-picker | Yes | Non-empty |
| Interior Color | text | Yes | Non-empty |

#### Section 3 — Condition & History
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Condition | select | Yes | Options: Excellent, Good, Fair |
| Title Status | select | Yes | Options: Clean, Salvage, Rebuilt, Lemon |
| Condition Notes | textarea | No | Max 2000 chars |

#### Section 4 — Pricing
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Price | currency input | Yes | Positive number, min $1,000 |

#### Section 5 — Description & Highlights
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Description | rich textarea | No (required for publish) | Max 5000 chars |
| Vehicle Highlights | tag/chip input | No | Max 20 highlights, each max 80 chars |
| Feature Checklist | multi-select checkboxes | No | Predefined list: Autopilot, Premium Audio, Heated Seats, Tow Hitch, Glass Roof, etc. |

#### Section 6 — Photos
Drag-and-drop upload zone. Accepts JPEG, PNG, WebP. Max 20 images, max 10MB each. Shows upload progress per file. After upload, images appear as a reorderable grid. The first image is automatically the primary (hero) image. Owner can drag to reorder or click a star icon to set a different primary. Each image has a delete (trash) icon with inline confirmation ("Remove this photo?").

#### Section 7 — Internal Notes
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Internal Notes | textarea | No | Max 5000 chars; never visible to customers |

#### Sticky Bottom Bar — Buttons
| Button | Style | Behavior |
|--------|-------|----------|
| Save Draft | Secondary (outline) | Validates required fields in Sections 1-3 only. Creates Vehicle record with `vehicle_status = Draft`. Toast: "Vehicle saved as draft." Owner stays on the page, URL updates to `/admin/inventory/[id]/edit`. |
| Publish | Primary | Validates ALL required fields including Description (Section 5) and at least 1 photo (Section 6). If validation fails, scroll to first error, show inline messages. If valid, creates or updates Vehicle with `vehicle_status = Listed`. Toast: "Vehicle published and live on the site." Redirects to `/admin/inventory`. |
| Cancel | Text/ghost | If form is dirty, shows confirmation dialog: "Discard unsaved changes?" If confirmed or form is clean, redirects to `/admin/inventory`. |

#### Entities Affected
* `Vehicle` — created with status `Draft` or `Listed`.
* `VehicleMedia` — one record per uploaded photo, linked via `vehicle_id`.

#### Audit Events
* `vehicle.created` — on first save (draft or publish).
* `vehicle.published` — if published directly.

#### Error States
* VIN already exists: inline error under VIN field — "A vehicle with this VIN already exists."
* Photo upload fails: red badge on the failed image with "Upload failed — click to retry."
* Server error on save: toast with "Something went wrong. Your changes were not saved. Please try again."

#### Edge Cases
* Owner refreshes mid-form: unsaved data is lost. No auto-save for MVP.
* Owner uploads 20 photos then tries to add more: upload zone shows "Maximum 20 photos reached." Upload button is disabled.
* Owner tries to publish without photos: validation error — "At least one photo is required to publish."

#### Acceptance Criteria
- [ ] Owner can fill all fields and save as draft without photos.
- [ ] Owner can publish only when all required fields and at least 1 photo are present.
- [ ] VIN uniqueness is enforced.
- [ ] Photos are reorderable via drag-and-drop.
- [ ] Primary photo can be changed.
- [ ] Internal notes are never exposed on public pages.
- [ ] Draft vehicles do not appear on the public inventory page.

---

### Scenario B — Edit an Existing Vehicle Listing

**Actor:** Owner
**Trigger:** Owner clicks a vehicle row or "Edit" button in the inventory list.
**Preconditions:** Vehicle exists in any status except `Archived`.

#### Route
`/admin/inventory/[id]/edit`

#### Page Layout
Identical to the Add Vehicle form (Scenario A), pre-populated with existing data. The sticky bottom bar shows different button options depending on the vehicle's current status.

#### Behavior Differences from Add
* **Pre-populated fields:** All sections are filled with existing values.
* **Photo gallery:** Existing photos are shown in their current order. New photos can be added. Existing photos can be reordered or removed.
* **Status badge:** A non-editable status badge appears at the top of the page showing the current vehicle status (e.g., "Draft", "Listed", "Reserved").

#### Sticky Bottom Bar — Buttons (varies by status)

**If Draft:**
| Button | Style | Behavior |
|--------|-------|----------|
| Save | Primary | Saves all changes. Toast: "Changes saved." Stays on page. |
| Publish | Secondary | Same publish validation as Scenario A. |
| Delete Draft | Destructive (red text) | Confirmation dialog: "Delete this draft? This cannot be undone." Deletes Vehicle and all linked VehicleMedia. Redirects to `/admin/inventory`. |

**If Listed:**
| Button | Style | Behavior |
|--------|-------|----------|
| Save Changes | Primary | Saves edits. Changes are immediately live on the public site. Toast: "Changes saved and live." |
| Unpublish | Secondary | Confirmation: "Unpublish this vehicle? It will be removed from the public site but your data is preserved." Moves to `Draft`. Toast: "Vehicle unpublished." |

**If Reserved or Under Contract:**
| Button | Style | Behavior |
|--------|-------|----------|
| Save Changes | Primary | Saves edits. Toast: "Changes saved." |

*Note:* Status changes for Reserved/Under Contract/Sold are handled via the status management flow (Scenario C), not from the edit form.

#### Dirty State
If any field has been modified since page load and the owner tries to navigate away without saving, a browser confirmation dialog appears.

#### Audit Events
* `vehicle.updated` — on every save, with a snapshot of changed fields.

#### Acceptance Criteria
- [ ] All existing data loads correctly in the edit form.
- [ ] Photos display in correct order with ability to reorder.
- [ ] Saving a Listed vehicle updates the public listing immediately.
- [ ] Dirty state warning appears on navigation with unsaved changes.
- [ ] Draft vehicles can be deleted; Listed vehicles cannot.

---

### Scenario C — Change Vehicle Status

**Actor:** Owner
**Trigger:** Owner uses a status action from the vehicle edit page or the inventory list.
**Preconditions:** Vehicle exists.

#### UI Entry Points

**Option 1 — Inventory list page (`/admin/inventory`):**
Each vehicle row has a "Status" dropdown or action menu (three-dot icon) with available transitions based on current status.

**Option 2 — Vehicle edit page (`/admin/inventory/[id]/edit`):**
A "Status" section at the top of the page with action buttons for valid transitions.

#### Transition Matrix

| Current Status | Available Transitions | Trigger | Confirmation Required |
|---------------|----------------------|---------|----------------------|
| Draft | → Listed | "Publish" button | No (but publish validation runs) |
| Listed | → Reserved | "Mark Reserved" | Yes — "Reserve this vehicle? It will be hidden from public inventory." |
| Listed | → Draft (unpublish) | "Unpublish" | Yes — "Remove from public site?" |
| Reserved | → Under Contract | "Move to Contract" | Yes — "Begin contract phase for this vehicle?" |
| Reserved | → Listed | "Release Reservation" | Yes — "Release this reservation? The vehicle will return to public inventory." |
| Under Contract | → Sold | "Mark Sold" | Yes — "Mark this vehicle as sold? This is a final state." |
| Under Contract | → Listed | "Cancel Contract" | Yes — "Cancel the contract? Vehicle returns to public inventory." |
| Sold | → Archived | "Archive" | No |
| Any except Archived | → Archived | "Archive" (in action menu) | Yes — "Archive this vehicle? It will be hidden from all views except historical records." |

#### What Happens on Each Transition

**Draft → Listed:**
* Vehicle appears on public inventory page.
* `vehicle.published` event logged.

**Listed → Reserved:**
* Vehicle is hidden from public inventory (or shown with "Reserved" badge — product decision, recommend hiding for MVP).
* Owner is prompted to link this reservation to a Deal record. If a Deal already exists (from deposit), the linkage is automatic. If manual reservation, a Deal at `Lead` state may be created.
* `vehicle.reserved` event logged.

**Reserved → Listed (release):**
* Vehicle returns to public inventory.
* Linked Deal (if any) moves to `Cancelled` unless Owner specifies otherwise.
* `vehicle.reservation_released` event logged.

**Under Contract → Sold:**
* Vehicle is permanently removed from public views.
* Linked Deal moves to `Completed`.
* `vehicle.sold` event logged.

**Any → Archived:**
* Vehicle is hidden from the main inventory list but accessible via an "Archived" filter in admin.
* All linked VehicleInquiries remain accessible in admin but are effectively closed.

#### Linked Record Behavior
* Existing VehicleInquiry records remain linked and viewable in admin regardless of status changes.
* Active Deals are updated when vehicle status changes (see transition rules above).
* Customers who submitted inquiries are NOT automatically notified of status changes for MVP.

#### Acceptance Criteria
- [ ] Each status shows only valid transition options.
- [ ] Confirmation dialogs appear for all destructive/significant transitions.
- [ ] Public inventory reflects status changes immediately.
- [ ] Linked Deal records update correctly on status transitions.
- [ ] Archived vehicles are still accessible via admin filter.

---

### Scenario D — Review Inbound Customer Inquiry

**Actor:** Owner
**Trigger:** Owner navigates to the inquiries section or receives a notification indicator.
**Preconditions:** At least one VehicleInquiry exists.

#### Routes
* Inquiry list: `/admin/inquiries`
* Inquiry detail: `/admin/inquiries/[id]`

#### Inquiry List Page Layout
A data table with columns:
| Column | Content |
|--------|---------|
| Date | Submission timestamp |
| Customer Name | From inquiry form |
| Email | From inquiry form |
| Phone | From inquiry form |
| Vehicle | Linked vehicle year/make/model (clickable link to vehicle edit page) |
| Status | Badge: `New`, `Reviewed`, `Responded`, `Converted`, `Closed` |
| Actions | "View" button |

**Sorting:** Default sort by date descending (newest first).
**Filtering:** Tabs or filter dropdown for status. Free-text search by customer name or email.
**Empty state:** "No inquiries yet. Customer inquiries will appear here when submitted."

#### Inquiry Detail Page Layout

**Header:** Customer name, email, phone, preferred contact method, submission date.

**Vehicle Card:** A compact summary card showing the linked vehicle (photo thumbnail, year/make/model, price, status). Clicking the card navigates to the vehicle edit page.

**Inquiry Content:**
* Customer's message (read-only).
* Trade-in interest flag (Yes/No).
* Financing interest flag (Yes/No).

**Owner Actions Section:**
| Button | Style | Behavior |
|--------|-------|----------|
| Mark Reviewed | Secondary | Changes inquiry status to `Reviewed`. Toast: "Inquiry marked as reviewed." |
| Mark Responded | Secondary | Changes status to `Responded`. Implies owner contacted the customer outside the platform. Toast: "Inquiry marked as responded." |
| Convert to Deal | Primary | Opens a modal to create a Deal record linked to this customer and vehicle. See Scenario E. |
| Close Inquiry | Destructive text | Confirmation: "Close this inquiry? It will be moved to the closed list." Status → `Closed`. |

**Owner Notes:** A textarea for internal notes about this inquiry. Saves inline with a "Save Note" button. Notes are never visible to customers.

**Activity Log:** A chronological list of status changes and notes, showing timestamps and actions taken.

#### Entities Affected
* `VehicleInquiry` — status updated.
* `Deal` — created if "Convert to Deal" is used.

#### Audit Events
* `inquiry.reviewed`
* `inquiry.responded`
* `inquiry.converted`
* `inquiry.closed`

#### Acceptance Criteria
- [ ] Inquiry list shows all inquiries with correct status badges.
- [ ] Owner can filter by status.
- [ ] Clicking an inquiry opens the detail view with all submitted data.
- [ ] Owner notes save correctly and persist.
- [ ] Convert to Deal creates a linked Deal record.

---

### Scenario E — Create a Deal from a Customer Inquiry

**Actor:** Owner
**Trigger:** Owner clicks "Convert to Deal" on an inquiry detail page.
**Preconditions:** VehicleInquiry exists with status `New`, `Reviewed`, or `Responded`. Linked vehicle is in `Listed` status.

#### UI
A modal dialog opens over the inquiry detail page.

**Modal Title:** "Create Deal from Inquiry"

**Pre-filled (read-only):**
* Customer: Name, Email, Phone (from inquiry).
* Vehicle: Year/Make/Model, VIN, Price (from linked vehicle).

**Editable Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Purchase Price | currency | Yes | Pre-filled with vehicle listing price. Owner can adjust. Min $1,000. |
| Deal Notes | textarea | No | Max 2000 chars |
| Initial Deal Status | select | Yes | Options: `Lead` (default), `Deposit Pending`. |

**Buttons:**
| Button | Style | Behavior |
|--------|-------|----------|
| Create Deal | Primary | Creates Deal record. Updates VehicleInquiry status to `Converted`. If a Customer record doesn't exist for this email, creates one. Toast: "Deal created." Modal closes. Inquiry detail page refreshes showing the linked Deal. |
| Cancel | Secondary | Closes modal. No changes. |

#### What Happens After Creation
* A `Deal` record is created linking the `customer_id` and `vehicle_id`.
* The inquiry status becomes `Converted` and a link to the new deal appears on the inquiry detail page.
* The vehicle status is NOT changed automatically — the owner controls when to mark it Reserved (typically after deposit).
* The deal appears in `/admin/deals`.

#### Edge Cases
* Vehicle is no longer `Listed` (was reserved/sold between page load and conversion): Server returns error. Modal shows: "This vehicle is no longer available. Status: [current status]."
* An existing Deal already links this customer + vehicle: Server returns warning. Modal shows: "A deal already exists for this customer and vehicle." with a link to the existing deal.
* Customer email doesn't match an existing Customer account: System creates a stub Customer record (no password, no login) that the customer can later claim during account registration.

#### Audit Events
* `deal.created` — with linked inquiry ID, vehicle ID, customer ID.
* `inquiry.converted` — with linked deal ID.

#### Acceptance Criteria
- [ ] Modal pre-fills customer and vehicle data correctly.
- [ ] Deal record is created with correct linkages.
- [ ] Inquiry status updates to Converted.
- [ ] Duplicate deal prevention works.
- [ ] Vehicle status conflict is handled gracefully.

---

### Scenario F — Upload Photos and Documents for a Vehicle

**Actor:** Owner
**Trigger:** Owner edits a vehicle and scrolls to the Photos section, or navigates to a dedicated media management area.
**Preconditions:** Vehicle record exists.

#### Route
Embedded in `/admin/inventory/[id]/edit` (Photos section — see Scenario A, Section 6).

#### Photo Upload Behavior

**Upload Zone:**
* Drag-and-drop area with dashed border and "Drop photos here or click to browse" text.
* Accepts: JPEG, PNG, WebP.
* Max file size: 10MB per image.
* Max count: 20 images per vehicle.
* On drop/select: each file shows an upload progress bar (0–100%).
* On completion: image thumbnail appears in the reorderable grid.
* On failure: red badge with "Failed — Retry" button.

**Photo Grid:**
* Thumbnails in a responsive grid (4 columns desktop, 2 mobile).
* Drag handles for reordering.
* Star icon on each photo: click to set as primary. The current primary shows a filled star.
* Trash icon on each photo: click shows inline confirmation "Remove?" with Yes/No. Removal deletes the VehicleMedia record and the stored file.

**Alt Text / Captions:** Not required for MVP. Future enhancement.

#### Document Upload (Owner-Only Attachments)
A separate "Documents" section below Photos for internal-only files (inspection reports, Carfax, purchase receipts). These are never visible to customers.

| Field | Type | Validation |
|-------|------|------------|
| Document file | file input | PDF, JPEG, PNG. Max 25MB. |
| Document label | text | Required. E.g., "Carfax Report", "Inspection Certificate". |

Documents display in a simple list with filename, label, upload date, and a delete action.

#### Entities Affected
* `VehicleMedia` — one record per photo. Fields: `vehicle_id`, `media_type=IMAGE`, `url`, `display_order`.
* A new lightweight `VehicleDocument` entity for owner-only attachments: `vehicle_id`, `document_label`, `file_url`, `uploaded_at`.

#### Acceptance Criteria
- [ ] Drag-and-drop uploads work with progress indicators.
- [ ] Images can be reordered.
- [ ] Primary photo can be changed.
- [ ] Failed uploads show retry option.
- [ ] Max 20 photos enforced.
- [ ] Documents upload separately and are never publicly visible.

---

### Scenario G — Review Customer "Request a Vehicle" Submissions

**Actor:** Owner
**Trigger:** Owner navigates to the vehicle requests section.
**Preconditions:** At least one VehicleRequest exists.

#### Routes
* Request list: `/admin/requests`
* Request detail: `/admin/requests/[id]`

#### Request List Page Layout
Data table with columns:
| Column | Content |
|--------|---------|
| Date | Submission date |
| Customer | Name and email |
| Vehicle Desired | Make / Model / Year range |
| Budget | Max budget |
| Status | Badge: `Submitted`, `Under Review`, `Sourcing`, `Vehicle Proposed`, `Customer Approved`, `Converted to Deal`, `Closed` |
| Priority | Optional internal tag: High / Medium / Low |
| Actions | "View" button |

**Sorting:** Default by date descending.
**Filtering:** Status filter tabs. Free-text search.
**Empty state:** "No vehicle requests yet. Customer sourcing requests will appear here."

#### Request Detail Page Layout

**Header:** Customer name, email, phone, submission date, current status badge.

**Request Details Card:**
* Desired Make
* Desired Model
* Year Range (min – max)
* Max Budget
* Max Mileage
* Color Preferences
* Must-Have Features
* Preferred Timeline
* Financing Interest (Yes/No)
* Trade-In Interest (Yes/No)
* Customer Notes

**Owner Actions:**
| Button | Style | Behavior |
|--------|-------|----------|
| Mark Under Review | Secondary | Status → `Under Review`. Toast: "Request marked under review." |
| Mark Sourcing | Secondary | Status → `Sourcing`. Toast: "Actively sourcing." |
| Add Proposal | Primary | Opens the proposal creation flow (Scenario H). |
| Close Request | Destructive text | Confirmation: "Close this request? The customer will see it as closed." Status → `Closed`. |

**Internal Notes Section:**
* Textarea for owner notes (auction links, pricing notes, sourcing strategy).
* Each note saves with a timestamp. Multiple notes accumulate as a chronological thread.
* Notes are never visible to customers.

**Priority Selector:**
* Dropdown or toggle: High / Medium / Low.
* Saves inline. Helps owner triage multiple requests.

**Proposals Section:**
* Lists all VehicleProposal records linked to this request.
* Each proposal shows: VIN, Make/Model/Year, Mileage, Estimated Price, Status, Date.
* Clicking a proposal opens its detail.

#### Entities Affected
* `VehicleRequest` — status updates.
* `VehicleProposal` — listed and managed from this page.

#### Audit Events
* `request.reviewed`
* `request.sourcing_started`
* `request.closed`

#### Acceptance Criteria
- [ ] Request list displays all requests with correct status badges.
- [ ] Owner can progress requests through status stages.
- [ ] Internal notes persist and are never customer-visible.
- [ ] Proposals linked to the request are displayed correctly.

---

### Scenario H — Convert a Sourcing Request into an Active Vehicle Opportunity

**Actor:** Owner
**Trigger:** Owner clicks "Add Proposal" on a VehicleRequest detail page, or a customer approves a proposal.
**Preconditions:** VehicleRequest exists with status `Sourcing` or later.

#### Flow 1 — Owner Creates a Proposal

**UI:** A modal or slide-out panel from the request detail page.

**Modal Title:** "Propose a Vehicle"

**Fields:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| VIN | text | No | 17 chars if provided |
| Make | text | Yes | Non-empty |
| Model | text | Yes | Non-empty |
| Year | number | Yes | 4-digit year |
| Mileage | number | Yes | Non-negative |
| Estimated Price | currency | Yes | Min $1,000 |
| Photos | file upload | No | Up to 5 images |
| Notes | textarea | No | E.g., "Clean Carfax, one owner, 92% battery health" |

**Buttons:**
| Button | Style | Behavior |
|--------|-------|----------|
| Send Proposal | Primary | Creates VehicleProposal with status `Proposed`. Updates VehicleRequest status to `Vehicle Proposed` (if not already). Toast: "Proposal sent to customer." |
| Cancel | Secondary | Closes modal. |

**After submission:** The proposal appears in the customer's portal under their request, showing the vehicle details and a prompt to Accept or Decline.

#### Flow 2 — Customer Approves a Proposal (from customer portal)

When the customer clicks "Accept" on a proposal in their portal:
* `VehicleProposal` status → `Customer Accepted`.
* `VehicleRequest` status → `Customer Approved`.
* Owner sees a notification/badge in admin: "Customer approved proposal #X for request #Y."
* Owner then manually creates a Vehicle record (using the proposal data as a starting point) and a Deal record, linking request → vehicle → deal → customer.
* `VehicleRequest` status → `Converted to Deal`.

#### Flow 3 — Customer Declines a Proposal

* `VehicleProposal` status → `Customer Declined`.
* `VehicleRequest` status remains `Vehicle Proposed` or returns to `Sourcing` if no other active proposals exist.
* Owner is notified.

#### Flow 4 — Linking a Proposal to Actual Inventory

Once a sourced vehicle is acquired:
1. Owner creates a Vehicle record (Scenario A), possibly pre-filling from the proposal data.
2. Owner links the VehicleRequest to this Vehicle via "Convert to Deal" — creating a Deal that references both the vehicle and the customer.
3. The customer is prompted to place a deposit, entering the standard purchase flow (Journey 1, Step 4 from canon doc 03).

#### Entities Affected
* `VehicleProposal` — created and status-managed.
* `VehicleRequest` — status transitions.
* `Vehicle` — created when sourced vehicle is acquired.
* `Deal` — created on conversion.

#### Audit Events
* `proposal.created`
* `proposal.accepted`
* `proposal.declined`
* `request.converted`
* `deal.created`

#### Acceptance Criteria
- [ ] Owner can create proposals with vehicle details and optional photos.
- [ ] Customer can view proposals in portal with Accept/Decline actions.
- [ ] Accepted proposal correctly updates request and proposal statuses.
- [ ] Owner can create a Vehicle and Deal from an approved proposal.
- [ ] Declined proposals don't block further sourcing.

---

## 5. Customer Scenarios

---

### Scenario I — Browse Inventory

**Actor:** Customer (or anonymous visitor)
**Trigger:** Visitor navigates to the inventory page via navigation or homepage CTA.
**Preconditions:** None (public page).

#### Route
`/inventory`

#### Page Layout

**Header:** Site navigation bar. On this page, the nav highlights "Inventory."

**Filter Bar (above results):**
A horizontal filter strip with:
* Make (dropdown or pill selector)
* Price Range (dual-handle slider or min/max inputs)
* Year (min/max inputs or range selector)
* Drivetrain (pill selector: All, AWD, RWD, FWD)
* "Clear All" link (appears when any filter is active)

Filters apply immediately on selection (no "Apply" button). URL query params update to reflect active filters so the page state survives refresh and is shareable.

**Sort Dropdown:** Right-aligned above results. Options: "Newest First" (default), "Price: Low to High", "Price: High to Low", "Lowest Mileage."

**Results Grid:**
Responsive card grid — 3 columns on desktop, 2 on tablet, 1 on mobile.

**Vehicle Card Contents:**
* Primary photo (fills card width, 3:2 aspect ratio).
* Year, Make, Model (one line, bold).
* Trim (smaller text, if present).
* Price (prominent, formatted as currency).
* Mileage (e.g., "12,450 mi").
* Battery Range (e.g., "285 mi range") — if available.
* Drivetrain badge (small pill: "AWD").
* Primary CTA: "View Details" (full-width button at card bottom, links to VDP).

**No hover-state pricing tricks.** Card is clean and informational.

#### Pagination
Simple "Load More" button at the bottom for MVP (not infinite scroll, not numbered pages). Shows "Showing X of Y vehicles."

#### Empty State — No Inventory
If zero vehicles are `Listed`:
* Centered content block with:
  * Headline: "Our inventory is being updated."
  * Subtext: "Check back soon or tell us what you're looking for."
  * CTA Button: "Request a Vehicle" → links to `/request-vehicle`.

#### No-Results State (filters applied but no matches)
* Centered message: "No vehicles match your filters."
* "Clear all filters" link.
* Secondary CTA: "Can't find what you need? Request a Vehicle" → `/request-vehicle`.

#### Loading State
Skeleton cards matching the grid layout: gray rectangular placeholder for photo, shimmer lines for text.

#### Mobile Considerations
* Filters collapse into a "Filters" button that opens a bottom sheet/drawer.
* Inside the drawer, all filters are stacked vertically with an "Apply" button (mobile exception to the instant-apply rule for usability).
* Cards stack single-column.

#### Entities Involved
* `Vehicle` (read-only, `Listed` status only).
* `VehicleMedia` (primary image for each card).

#### Acceptance Criteria
- [ ] Only `Listed` vehicles appear.
- [ ] Filters work and update URL query params.
- [ ] Page state persists on refresh.
- [ ] Card shows correct primary image, specs, and price.
- [ ] Empty and no-results states render correctly.
- [ ] Mobile filter drawer works.
- [ ] "View Details" navigates to the correct VDP.

---

### Scenario J — Filter and Search Inventory

**Actor:** Customer (or anonymous visitor)
**Trigger:** Customer interacts with filter controls on `/inventory`.
**Preconditions:** Customer is on the inventory page.

This scenario is embedded in Scenario I. The additional detail here covers filter behavior.

#### Filter Definitions

| Filter | Control Type | Behavior |
|--------|-------------|----------|
| Make | Multi-select pills or dropdown | Shows only makes that exist in current `Listed` inventory. Selecting multiple makes shows vehicles matching ANY selected make. |
| Price Range | Dual slider or min/max number inputs | Min defaults to lowest listed price, max to highest. Adjusting immediately filters results. |
| Year | Min/Max number inputs | Defaults to full range of listed inventory. |
| Drivetrain | Pill toggle (All / AWD / RWD / FWD) | "All" is default. Selecting one filters to that type. |
| Mileage | Max number input or slider | Defaults to no limit. |
| Range (Battery) | Min number input | "Minimum range" filter. Defaults to no minimum. |

#### URL Query Param Behavior
Example: `/inventory?make=Tesla&priceMin=30000&priceMax=60000&drivetrain=AWD`

All filters are reflected as query params. This means:
* Sharing a URL preserves the exact filter state.
* Browser back/forward navigates between filter states.
* Page refresh re-applies filters.

#### Clear All Behavior
A "Clear All" text link appears next to the filter bar when any filter is active. Clicking it resets all filters to defaults and updates the URL to `/inventory`.

#### Result Count
A line above the grid: "12 vehicles" or "3 vehicles match your filters." Count updates instantly with filter changes.

#### Acceptance Criteria
- [ ] Each filter independently narrows results.
- [ ] Multiple filters combine with AND logic.
- [ ] URL updates reflect active filters.
- [ ] "Clear All" resets everything.
- [ ] Result count is accurate.
- [ ] Filters only show options that exist in current inventory (no dead filters).

---

### Scenario K — Open Vehicle Detail Page (VDP)

**Actor:** Customer (or anonymous visitor)
**Trigger:** Customer clicks "View Details" on an inventory card.
**Preconditions:** Vehicle is `Listed`.

#### Route
`/inventory/[slug]` (slug = year-make-model-vin-last-6, e.g., `2023-tesla-model-3-abc123`)

#### Page Layout (Desktop)

**Two-column layout:**
* **Left column (60%):** Media gallery + description.
* **Right column (40%):** Pricing block + action panel (sticky on scroll).

**Media Gallery (left):**
* Large hero image (primary photo).
* Thumbnail strip below for additional photos.
* Clicking a thumbnail swaps the hero image.
* Lightbox opens on hero click for full-screen browsing.
* If a video walkthrough exists, it appears as a playable embed in the gallery or a dedicated "Watch Walkthrough" section below.

**Vehicle Facts Block (below gallery, left):**
A clean grid of key specs with subtle icons:
* Year / Make / Model / Trim
* Mileage
* Drivetrain
* Battery Range Estimate
* Exterior Color
* Interior Color
* Condition
* Title Status
* VIN (last 6 digits displayed, full VIN on hover/click)

**Description Section (left):**
* Owner-written description rendered as formatted text.
* Vehicle highlights displayed as subtle chips/tags.

**Feature Checklist (left):**
* Checked features from the predefined list shown as a clean grid with check icons.

**Pricing Block (right, sticky):**
* Price displayed large and bold.
* Below price: "Reservation deposit: $500–$1,000" (informational).
* Below that: "This deposit is credited toward your purchase price."

**Action Panel (right, sticky):**

| Button | Style | Behavior |
|--------|-------|----------|
| Reserve with Deposit | Primary, large | Navigates to `/inventory/[slug]/reserve`. See Scenario M. |
| Ask About This Vehicle | Secondary | Opens inquiry modal. See Scenario L. |
| Have a Trade-In? | Text link / tertiary | Opens trade-in capture modal. See Scenario P. |
| Need Financing? | Text link / tertiary | Opens financing interest modal. See Scenario Q. |

**Ownership Experience Section (below description, left):**
* Subtle, non-intrusive mention of Baytech charger/solar services.
* "Interested in a home EV charger or solar installation?" with a small "Learn More" link.

**Related Vehicles (bottom of page):**
* If other vehicles are listed, show up to 3 cards in a horizontal row.
* "View All Inventory" link.

#### Page Layout (Mobile)
* Single column. Gallery at top (swipeable carousel).
* Vehicle facts stacked.
* Action panel becomes a sticky bottom bar with "Reserve" as the primary button.
* "Ask About This Vehicle" becomes a secondary button next to it.
* Trade-in and financing links move into the body content.

#### Loading State
* Skeleton for gallery (large rectangle + thumbnail strip).
* Skeleton lines for specs and description.
* Skeleton block for pricing panel.

#### Error State — Vehicle No Longer Available
If a customer navigates to a VDP for a vehicle that is no longer `Listed`:
* Show a clean page: "This vehicle is no longer available."
* CTA: "Browse Current Inventory" → `/inventory`.
* Do NOT show a raw 404 page.

#### Entities Involved
* `Vehicle` (read-only).
* `VehicleMedia` (all images and videos for this vehicle).

#### SEO Considerations (MVP)
* Page title: "[Year] [Make] [Model] [Trim] — Evo Motors"
* Meta description: Auto-generated from price, mileage, and first 160 chars of description.
* Open Graph image: Primary photo URL.

#### Acceptance Criteria
- [ ] All vehicle data renders correctly.
- [ ] Photo gallery is functional with lightbox.
- [ ] Sticky action panel works on desktop scroll.
- [ ] Mobile sticky bar shows primary CTA.
- [ ] Unavailable vehicle shows graceful message, not 404.
- [ ] All action buttons trigger the correct flows.

---

### Scenario L — Submit an Inquiry on a Vehicle

**Actor:** Customer (or anonymous visitor)
**Trigger:** Customer clicks "Ask About This Vehicle" on a VDP.
**Preconditions:** Vehicle is `Listed`.

#### UI
A modal dialog opens over the VDP.

**Modal Title:** "Ask About This [Year] [Make] [Model]"

**Vehicle Summary (read-only, top of modal):** Thumbnail, year/make/model, price.

#### Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| First Name | text | Yes | Non-empty, max 100 chars |
| Last Name | text | Yes | Non-empty, max 100 chars |
| Email | email | Yes | Valid email format |
| Phone | tel | Yes | Valid phone number (10+ digits) |
| Preferred Contact Method | radio | Yes | Options: Email, Phone, Either |
| Message | textarea | No | Max 2000 chars |
| I have a vehicle to trade in | checkbox | No | Default unchecked |
| I'm interested in financing | checkbox | No | Default unchecked |

#### Buttons
| Button | Style | Behavior |
|--------|-------|----------|
| Send Inquiry | Primary | Validates all fields. On success, creates VehicleInquiry record, closes modal, shows success state. Button shows spinner during submission. |
| Cancel / X | Close icon | Closes modal. If fields are partially filled, no warning (low-friction). |

#### Spam Prevention
For MVP: honeypot field (hidden field that bots fill but humans don't). If the honeypot field is filled, the server silently discards the submission and still shows the success state.

#### On Successful Submission
* Modal content transitions to a success view:
  * Check icon.
  * Headline: "Thanks, [First Name]!"
  * Subtext: "We've received your inquiry about the [Year] [Make] [Model]. Someone from our team will reach out within one business day."
  * "Close" button.
* A VehicleInquiry record is created with:
  * `vehicle_id`
  * `customer_name` (first + last)
  * `customer_email`
  * `customer_phone`
  * `preferred_contact`
  * `message`
  * `trade_in_interest` (boolean)
  * `financing_interest` (boolean)
  * `inquiry_status = New`

#### Duplicate Inquiry Handling
If the same email has already submitted an inquiry for the same vehicle within the last 24 hours:
* Server still accepts the submission (no block).
* The existing inquiry is updated with the new message (appended) rather than creating a duplicate.
* Same success state shown to the customer.

#### Owner Notification
* A badge/counter increments on the "Inquiries" nav item in the admin dashboard.
* For MVP, no email notification to the owner (future enhancement).

#### Entities Affected
* `VehicleInquiry` — created with status `New`.

#### Audit Events
* `inquiry.submitted`

#### Acceptance Criteria
- [ ] Modal opens with vehicle context.
- [ ] All validations work on required fields.
- [ ] Success state displays correctly after submission.
- [ ] VehicleInquiry record is created with correct data.
- [ ] Honeypot field prevents basic bot submissions.
- [ ] Duplicate inquiry from same email + vehicle within 24h updates existing record.

---

### Scenario M — Reserve a Vehicle / Place Deposit

**Actor:** Customer (may be anonymous at start)
**Trigger:** Customer clicks "Reserve with Deposit" on a VDP.
**Preconditions:** Vehicle is `Listed`.

#### Route
`/inventory/[slug]/reserve`

A dedicated page (not a modal) to convey seriousness and trust for a financial transaction.

#### Page Layout

**Left Column (60%):**
Vehicle summary card: primary photo, year/make/model, price, VIN (partial).

**Trust Copy:**
* Headline: "Reserve Your [Year] [Make] [Model]"
* Body: "Place a refundable reservation deposit to hold this vehicle. Your deposit is fully credited toward the purchase price. After reserving, you'll create an account to complete the purchase process."
* Deposit amount displayed prominently: "$[amount]"

**Right Column (40%) — Reservation Form:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| First Name | text | Yes | Non-empty |
| Last Name | text | Yes | Non-empty |
| Email | email | Yes | Valid email |
| Phone | tel | Yes | Valid phone |
| Message / Notes | textarea | No | Max 1000 chars |
| Agreement checkbox | checkbox | Yes | Must be checked. Label: "I understand this is a refundable reservation deposit of $[amount] that will be credited toward my purchase." |

**Below form: Stripe payment element.** Rendered via Stripe Elements (card input). Styled to match the Evo Motors design.

**Buttons:**
| Button | Style | Behavior |
|--------|-------|----------|
| Place Deposit — $[amount] | Primary, large | Validates form. If valid, initiates Stripe payment. Button shows spinner: "Processing..." Disabled during processing. |
| Back to Vehicle | Text link | Returns to VDP. |

#### Payment Flow (Step by Step)

1. Customer fills form and clicks "Place Deposit."
2. **Client:** Form validates. If errors, scroll to first error.
3. **Client → Server:** Server action creates a `DealDeposit` record with `payment_status = PENDING` and a `Deal` record with `deal_status = Deposit Pending`. Returns a Stripe `PaymentIntent` client secret.
4. **Client:** Stripe Elements confirms the payment using the client secret.
5. **Stripe → Server (webhook):** Stripe sends `payment_intent.succeeded` webhook.
6. **Server:** Verifies webhook signature. Updates `DealDeposit.payment_status = SUCCEEDED`. Updates `Deal.deal_status = Deposit Received`. Updates `Vehicle.vehicle_status = Reserved`.
7. **Client:** Receives confirmation. Redirects to success page.

#### Concurrency / Race Condition Handling
Before creating the PaymentIntent (Step 3), the server checks `Vehicle.vehicle_status`:
* If still `Listed`: proceed.
* If `Reserved`, `Under Contract`, or `Sold`: return an error. The page shows: "This vehicle was just reserved by another customer. We're sorry for the inconvenience." with a CTA: "Browse Other Vehicles" → `/inventory`.

#### Success Page
Route: `/reservation/[deal-id]/confirmation`

* Large check icon.
* Headline: "Your [Year] [Make] [Model] is Reserved!"
* Reservation summary:
  * Vehicle: year/make/model
  * Deposit: $[amount]
  * Date: [timestamp]
  * Confirmation Number: [deal ID or friendly reference]
* Next Steps copy:
  * "Create your account to access your purchase portal."
  * "Upload your driver's license and proof of insurance."
  * "We'll send your purchase agreement for digital signature."
* CTA: "Create Your Account" → account registration flow (pre-fills email from deposit form).
* Support: "Questions? Contact us at [phone] or [email]."

#### Failure States
* **Card declined:** Inline error below the Stripe element: "Your card was declined. Please try a different payment method."
* **Network error:** Toast: "Something went wrong. Your card was not charged. Please try again."
* **Payment succeeded but server status update fails:** The Stripe webhook is the source of truth. Even if the client-side redirect fails, the webhook will update the deal and vehicle status. A background reconciliation job ensures consistency.

#### Entities Affected
* `Deal` — created with `Deposit Pending`, then updated to `Deposit Received`.
* `DealDeposit` — created with `PENDING`, then `SUCCEEDED`.
* `Vehicle` — status changed to `Reserved` on payment success.
* `Customer` — created (stub) if no account exists for this email.

#### Audit Events
* `deal.created`
* `deposit.initiated`
* `deposit.completed`
* `vehicle.reserved`

#### Acceptance Criteria
- [ ] Reservation form validates all required fields.
- [ ] Agreement checkbox must be checked before payment.
- [ ] Stripe payment element renders and processes payment.
- [ ] Vehicle concurrency check prevents double-reservation.
- [ ] Webhook correctly updates deal, deposit, and vehicle status.
- [ ] Success page shows correct reservation details.
- [ ] Card decline shows specific error message.
- [ ] Customer can proceed to account creation from success page.

---

### Scenario N — Submit a "Find Me This Car" Request

**Actor:** Customer (or anonymous visitor)
**Trigger:** Customer clicks "Request a Vehicle" from navigation, homepage, or empty inventory state.
**Preconditions:** None.

#### Route
`/request-vehicle`

#### Page Layout

**Hero Section:**
* Headline: "Can't Find Your Dream EV?"
* Subtext: "Tell us what you're looking for, and our team will search our network to find it for you."

**Form — Single Page (not multi-step for MVP):**
The form is organized into visual sections with clear labels to avoid overwhelm.

**Section 1 — Vehicle Preferences:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Make | text / searchable select | Yes | Non-empty |
| Model | text / searchable select | Yes | Non-empty |
| Year Range (Min) | number / select | No | 4-digit year if provided |
| Year Range (Max) | number / select | No | 4-digit year if provided, ≥ min |
| Trim | text | No | Free text |
| Max Mileage | number | No | Non-negative |
| Color Preferences | text | No | Free text |
| Must-Have Features | textarea or tag input | No | Max 500 chars |

**Section 2 — Budget & Timeline:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Budget Range (Max) | currency input | Yes | Min $5,000 |
| Preferred Timeline | select | No | Options: "As soon as possible", "Within 1 month", "Within 3 months", "No rush" |

**Section 3 — Additional Info:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Interested in financing? | checkbox | No | |
| Have a vehicle to trade in? | checkbox | No | |
| Additional notes | textarea | No | Max 2000 chars |

**Section 4 — Contact Info:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| First Name | text | Yes | Non-empty |
| Last Name | text | Yes | Non-empty |
| Email | email | Yes | Valid email |
| Phone | tel | Yes | Valid phone |

#### Buttons
| Button | Style | Behavior |
|--------|-------|----------|
| Submit Request | Primary, large | Validates all required fields. Spinner on submit. Creates VehicleRequest record. Redirects to confirmation page. |

#### Confirmation Page
Route: `/request-vehicle/confirmation`

* Check icon.
* Headline: "Request Received!"
* Subtext: "We've received your request for a [Make] [Model]. Our team will review your preferences and begin searching. We'll reach out within 2 business days with an update."
* "Have an account? Sign in to track your request." → `/login`
* "Browse Current Inventory" → `/inventory`

#### Entities Affected
* `VehicleRequest` — created with status `Submitted`.
* `Customer` — if the email matches an existing customer, the request is linked. If not, a stub customer record is created.

#### Audit Events
* `request.submitted`

#### Acceptance Criteria
- [ ] All required fields validate.
- [ ] Request record is created with correct data and status.
- [ ] Confirmation page shows correct vehicle summary.
- [ ] Request appears in owner's admin dashboard immediately.
- [ ] Duplicate requests from the same email are allowed (customer may want multiple different vehicles).

---

### Scenario O — Start Purchase Flow

**Actor:** Customer
**Trigger:** Customer clicks "Reserve with Deposit" — this IS the start of the purchase flow.
**Preconditions:** Vehicle is `Listed`.

The purchase flow in the EVO Motors MVP is initiated by placing a deposit (Scenario M). There is no separate "Start Purchase" button that leads to a softer funnel — the deposit IS the commitment point, consistent with the Tesla-like purchase model.

**Post-deposit, the customer enters the portal purchase flow (Journey 1 from canon doc 03):**

1. **Account Creation** — Customer creates an account (email pre-filled from deposit).
2. **Document Upload** — Customer uploads Driver's License and Proof of Insurance in the portal.
3. **Contract Signing** — Owner sends DocuSign contracts; customer signs digitally.
4. **Financing / Final Payment** — Handled manually by the owner outside the system.
5. **Delivery** — Deal marked complete; vehicle marked sold.

The customer portal at `/portal` provides a milestone tracker that visualizes this progression. See canon doc 03, Section 6 for portal details.

#### Portal Dashboard (Post-Deposit)
Route: `/portal`

**Active Deal Card:**
* Vehicle photo thumbnail, year/make/model.
* Current status with a friendly label (e.g., "Awaiting Your Documentation").
* Next action prompt (e.g., "Upload your driver's license to continue").
* Milestone progress bar: Reserve → Documents → Contract → Delivery.
* CTA: "Continue" → navigates to the current step's page.

#### Acceptance Criteria
- [ ] Post-deposit, customer can create account and access portal.
- [ ] Portal shows active deal with correct status.
- [ ] Milestone tracker reflects current deal state.
- [ ] Each milestone step has a clear CTA.

---

### Scenario P — Submit Trade-In Details

**Actor:** Customer (or anonymous visitor)
**Trigger:** Customer clicks "Have a Trade-In?" on a VDP or during the vehicle request flow.
**Preconditions:** None (capture is standalone).

#### UI
A modal dialog.

**Modal Title:** "Tell Us About Your Trade-In"

#### Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Year | number / select | Yes | 4-digit year |
| Make | text / select | Yes | Non-empty |
| Model | text / select | Yes | Non-empty |
| Trim | text | No | Free text |
| Mileage | number | Yes | Non-negative |
| VIN | text | No | 17 chars if provided |
| Condition | select | Yes | Options: Excellent, Good, Fair, Poor |
| Photos | file upload | No | Up to 5 images, JPEG/PNG, max 5MB each |
| Additional Notes | textarea | No | Max 1000 chars |
| First Name | text | Yes (if not logged in) | Non-empty |
| Last Name | text | Yes (if not logged in) | Non-empty |
| Email | email | Yes (if not logged in) | Valid email |
| Phone | tel | No | Valid phone if provided |

*If the customer is authenticated, name/email/phone are pre-filled from their profile and read-only.*

#### Buttons
| Button | Style | Behavior |
|--------|-------|----------|
| Submit Trade-In Info | Primary | Validates, creates TradeInCapture record. Shows success view. |
| Cancel / X | Close | Closes modal. |

#### Success View (inside modal)
* Check icon.
* "Thanks! We'll review your trade-in details and factor it into your offer."
* "Our team will reach out within 2 business days."
* "Close" button.

#### Entities Affected
* `TradeInCapture` — new record with fields above. Links to `vehicle_id` (the vehicle being viewed, if applicable) and `customer_email`.

#### Owner Visibility
Trade-in submissions appear on:
* The linked VehicleInquiry detail page (if submitted from a VDP).
* A dedicated section in `/admin/trade-ins` or as a tab in the inquiries view.

#### Important Boundary
This is NOT an automated valuation. The owner reviews trade-in details manually and contacts the customer. Consistent with canon doc 09 (explicit non-goal: no trade-in automation).

#### Acceptance Criteria
- [ ] Modal collects trade-in vehicle details.
- [ ] Photos upload with progress.
- [ ] Record is created and linked to the context (vehicle or inquiry).
- [ ] Owner can see trade-in submissions in admin.
- [ ] No automated valuation is provided.

---

### Scenario Q — Express Financing Interest

**Actor:** Customer (or anonymous visitor)
**Trigger:** Customer clicks "Need Financing?" on a VDP.
**Preconditions:** None.

#### UI
A modal dialog.

**Modal Title:** "Financing Options"

**Informational Copy:**
"We work with multiple financing partners to find the best rate for you. Let us know you're interested, and our team will discuss options during the purchase process."

#### Fields
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| First Name | text | Yes (if not logged in) | Non-empty |
| Last Name | text | Yes (if not logged in) | Non-empty |
| Email | email | Yes (if not logged in) | Valid email |
| Phone | tel | Yes | Valid phone |
| Estimated Credit Score Range | select | No | Options: "Excellent (750+)", "Good (700-749)", "Fair (650-699)", "Below 650", "Not Sure" |
| Additional Notes | textarea | No | Max 1000 chars |

This is strictly intent capture. No credit application, no SSN, no sensitive financial data.

#### Buttons
| Button | Style | Behavior |
|--------|-------|----------|
| Submit | Primary | Creates a financing interest record. Shows success view. |
| Cancel / X | Close | Closes modal. |

#### Success View
* "We've noted your interest in financing."
* "Our team will discuss options with you when you're ready to move forward."

#### Entities Affected
The financing interest is captured as a flag + lightweight record:
* If submitted from a VDP: stored as `financing_interest = true` on the related `VehicleInquiry` (if one exists) or creates a new VehicleInquiry with just financing interest noted.
* Standalone capture: creates a record in `VehicleInquiry` with `financing_interest = true`, `vehicle_id` (from VDP context), and customer contact info.

This avoids creating a separate entity. Financing interest is a flag on the inquiry/lead, not a standalone application. Consistent with canon doc 09 (no lender integrations).

#### Acceptance Criteria
- [ ] Modal collects lightweight financing intent.
- [ ] No sensitive financial data (SSN, DOB) is collected.
- [ ] Interest is captured and visible to owner in admin.
- [ ] Success messaging sets correct expectations.

---

### Scenario R — Track Next Steps After Submitting Interest or Deposit

**Actor:** Customer (authenticated)
**Trigger:** Customer logs into the portal.
**Preconditions:** Customer has an active Deal, VehicleRequest, or VehicleInquiry.

#### Route
`/portal`

#### Portal Dashboard Layout

**Top Section — Active Deal (if exists):**
* Vehicle card: photo, year/make/model, price.
* Status badge with friendly label.
* Milestone tracker (visual progress bar):
  * Step 1: "Reserved" ✓ (completed)
  * Step 2: "Documents" (current — highlighted)
  * Step 3: "Contract"
  * Step 4: "Delivery"
* Next action card: "Upload your driver's license and proof of insurance." with "Upload Documents" CTA.
* Deposit confirmation: "$[amount] deposit received on [date]."

**Middle Section — Vehicle Requests (if any):**
* Card per request showing: Desired Make/Model, Status badge, Date submitted.
* Clicking opens a detail view showing:
  * Request details.
  * Any proposals from the dealer (with Accept/Decline buttons).
  * Status timeline.

**Bottom Section — Past Inquiries:**
* List of previous inquiries with vehicle info and status.
* Read-only — no actions needed.

**Baytech Section (if applicable):**
* Simple status line: "EV Charger Interest — Lead Shared with Baytech."

#### Status-Specific Messaging

| Deal Status | Customer Label | Next Action Prompt |
|-------------|---------------|-------------------|
| Deposit Received | "Vehicle Reserved" | "Upload your documents to continue." |
| Documents Pending | "Awaiting Your Documentation" | "Please upload your ID and insurance." |
| Contracts Sent | "Ready for Signature" | "Review and sign your purchase agreement." |
| Contracts Signed | "Contract Completed" | "We're finalizing your transaction." |
| Financing Pending | "Finalizing Transaction" | "Sit tight — we're working on the final details." |
| Ready for Delivery | "Ready for Pickup" | "Your vehicle is ready! Contact us to arrange pickup." |
| Completed | "Delivered" | "Congratulations on your new EV!" |

#### Edge Cases
* Customer has no active deals or requests: Show a welcome message with CTAs to browse inventory or request a vehicle.
* Customer's deal was cancelled: Show "This deal was cancelled on [date]" with a note about deposit refund status (if applicable) and a CTA to browse inventory.

#### Acceptance Criteria
- [ ] Portal displays correct deal status and milestone tracker.
- [ ] Next action prompts are specific and actionable.
- [ ] Vehicle requests show current sourcing status.
- [ ] Proposals can be accepted/declined from the portal.
- [ ] Empty portal state guides the customer to browse or request.

---

## 6. Recommended Implementation Order

Build scenarios in this order, each layer building on the previous:

| Phase | Scenarios | Rationale |
|-------|----------|-----------|
| 1 | A (Add Vehicle), B (Edit Vehicle), F (Photos) | Core inventory CRUD — everything else depends on vehicles existing. |
| 2 | I (Browse), J (Filter), K (VDP) | Public-facing browsing — validates that inventory is displayed correctly. |
| 3 | C (Status Changes) | Lifecycle management — connects admin actions to public visibility. |
| 4 | L (Inquiry), D (Review Inquiry) | First customer→owner interaction loop. |
| 5 | M (Deposit/Reserve) | Core transaction — Stripe integration, deal creation. |
| 6 | O (Purchase Flow), R (Portal Tracking) | Post-deposit portal experience. |
| 7 | E (Create Deal from Inquiry) | Owner workflow to convert leads. |
| 8 | N (Vehicle Request), G (Review Requests), H (Proposals) | Sourcing workflow. |
| 9 | P (Trade-In), Q (Financing) | Supplementary lead capture. |

---

## 7. Open Decisions Requiring Product Confirmation

1. **Reserved vehicles on public site:** Should reserved vehicles be hidden entirely from public inventory, or shown with a "Reserved" badge? *Recommendation for MVP:* Hide them. Simpler and avoids customer frustration.

2. **Owner email notifications:** Should the owner receive email notifications for new inquiries and deposit payments? *Recommendation for MVP:* Yes, basic email alerts for deposits. Inquiries can be badge-only in admin for v1.

3. **Customer account requirement for inquiries:** Should submitting an inquiry require an account? *Recommendation for MVP:* No. Anonymous inquiry is lower friction. Account creation happens at deposit.

4. **Deposit amount flexibility:** Is the deposit always a fixed amount per vehicle, or does the owner set it per vehicle? *Recommendation for MVP:* Global setting ($500 or $1,000), configurable in admin settings. Not per-vehicle.

5. **Trade-in as standalone page vs. modal:** Should trade-in capture be a modal from the VDP or a standalone page? *Recommendation for MVP:* Modal. Keeps the customer on the VDP where intent is highest.
