# 11 — Data Relationships and CTA Mapping

## 1. Purpose

This document maps every major user action in the Evo Motors platform to its data consequences: which records are created, updated, or linked, which status transitions occur, what validations run, and what the user sees afterward. It serves as the single source of truth for how the UI drives the database.

---

## 2. Core Entities

Entities from canon docs 04, 05, and 06 plus new MVP entities introduced in doc 10.

### 2.1 Existing Entities

| Entity | Canon Doc | Purpose |
|--------|----------|---------|
| Vehicle | 04 | Core inventory record |
| VehicleMedia | 04 | Photos and video links for a vehicle |
| VehicleRequest | 04 | Customer sourcing request |
| VehicleProposal | 04 | Dealer-proposed vehicle for a request |
| Deal | 05 | Central purchase transaction |
| DealDocument | 05 | Customer uploads and contract tracking |
| DealDeposit | 05 | Stripe deposit record |
| DocuSignEnvelope | 05 | Contract signature tracking |
| EnergyServiceRequest | 06 | Baytech lead capture |
| EnergyServiceStatusHistory | 06 | Baytech lifecycle audit |
| Customer | 02 | Registered customer account |

### 2.2 New MVP Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| VehicleInquiry | Customer question/interest on a listed vehicle | `id`, `vehicle_id`, `customer_name`, `customer_email`, `customer_phone`, `preferred_contact`, `message`, `trade_in_interest`, `financing_interest`, `inquiry_status`, `owner_notes`, `created_at` |
| TradeInCapture | Lightweight trade-in info from customer | `id`, `customer_email`, `vehicle_id` (nullable, context vehicle), `inquiry_id` (nullable), `year`, `make`, `model`, `trim`, `mileage`, `vin`, `condition`, `notes`, `created_at` |
| VehicleDocument | Owner-only internal documents for a vehicle | `id`, `vehicle_id`, `document_label`, `file_url`, `uploaded_at` |
| ActivityEvent | Audit trail for all significant actions | `id`, `event_type`, `actor_id`, `actor_role`, `entity_type`, `entity_id`, `metadata` (JSON), `created_at` |

---

## 3. Status Enums

### 3.1 Vehicle Status
```
Draft → Listed → Reserved → Under Contract → Sold → Archived
```
| Status | Public Visible | Customer Label | Admin Visible |
|--------|---------------|----------------|---------------|
| Draft | No | — | Yes |
| Listed | Yes | (browsable) | Yes |
| Reserved | No (MVP) | "Reserved" (portal only) | Yes |
| Under Contract | No | "Contract in Progress" (portal) | Yes |
| Sold | No | — | Yes |
| Archived | No | — | Yes (via filter) |

### 3.2 Deal Status
```
Lead → Deposit Pending → Deposit Received → Documents Pending → Contracts Sent → Contracts Signed → Financing Pending → Ready for Delivery → Completed
                                                                                                                                    ↘ Cancelled (from any state)
```
| Status | Customer Label |
|--------|---------------|
| Lead | (no portal access yet) |
| Deposit Pending | "Processing Deposit" |
| Deposit Received | "Vehicle Reserved" |
| Documents Pending | "Awaiting Your Documentation" |
| Contracts Sent | "Ready for Signature" |
| Contracts Signed | "Contract Completed" |
| Financing Pending | "Finalizing Transaction" |
| Ready for Delivery | "Ready for Pickup" |
| Completed | "Delivered" |
| Cancelled | "Deal Cancelled" |

### 3.3 Vehicle Request Status
```
Submitted → Under Review → Sourcing → Vehicle Proposed → Customer Approved → Converted to Deal → Closed
```

### 3.4 Vehicle Proposal Status
```
Proposed → Customer Accepted | Customer Declined | Expired
```

### 3.5 Inquiry Status
```
New → Reviewed → Responded → Converted → Closed
```

### 3.6 Deal Deposit Payment Status
```
PENDING → SUCCEEDED | FAILED | REFUNDED
```

### 3.7 Deal Document Status
```
PENDING → UPLOADED → VERIFIED → REJECTED
```

### 3.8 DocuSign Envelope Status
```
SENT → DELIVERED → COMPLETED → VOIDED
```

### 3.9 Energy Service Status
```
Interest Captured → Submitted to Baytech → Acknowledged → Contact Pending → Closed
```

---

## 4. Action Mapping Table

Every major CTA in the application, mapped to its full data consequences.

### 4.1 Owner Inventory Actions

| Screen | Button/Action | Data Write/Update | Linked Records | Status Change | Validation | Result | Audit Event |
|--------|--------------|-------------------|----------------|---------------|------------|--------|-------------|
| `/admin/inventory/new` | Save Draft | CREATE Vehicle (Draft) | VehicleMedia (if photos uploaded) | Vehicle → Draft | VIN unique, required fields (Sections 1-3) | Toast: "Saved as draft." Stay on page. URL → `/admin/inventory/[id]/edit` | `vehicle.created` |
| `/admin/inventory/new` | Publish | CREATE Vehicle (Listed) | VehicleMedia | Vehicle → Listed | All required fields + ≥1 photo + description | Toast: "Published." Redirect → `/admin/inventory` | `vehicle.created`, `vehicle.published` |
| `/admin/inventory/[id]/edit` | Save Changes | UPDATE Vehicle | VehicleMedia (add/remove/reorder) | No status change | Same as create, scoped to current status | Toast: "Changes saved." Stay on page. | `vehicle.updated` |
| `/admin/inventory/[id]/edit` | Publish (from Draft) | UPDATE Vehicle | — | Vehicle: Draft → Listed | All required + ≥1 photo + description | Toast: "Published." | `vehicle.published` |
| `/admin/inventory/[id]/edit` | Unpublish | UPDATE Vehicle | — | Vehicle: Listed → Draft | Confirmation dialog required | Toast: "Unpublished." | `vehicle.unpublished` |
| `/admin/inventory/[id]/edit` | Delete Draft | DELETE Vehicle + linked VehicleMedia | — | — | Confirmation dialog. Only available for Draft. | Toast: "Draft deleted." Redirect → `/admin/inventory` | `vehicle.deleted` |
| `/admin/inventory` or edit page | Mark Reserved | UPDATE Vehicle | May link/create Deal | Vehicle: Listed → Reserved | Confirmation dialog | Toast: "Marked reserved." | `vehicle.reserved` |
| Admin | Release Reservation | UPDATE Vehicle | Deal → Cancelled (optional) | Vehicle: Reserved → Listed | Confirmation dialog | Toast: "Reservation released." | `vehicle.reservation_released` |
| Admin | Move to Contract | UPDATE Vehicle | Deal → Documents Pending or Contracts Sent | Vehicle: Reserved → Under Contract | Confirmation dialog | Toast: "Moved to contract." | `vehicle.under_contract` |
| Admin | Mark Sold | UPDATE Vehicle | Deal → Completed | Vehicle: Under Contract → Sold | Confirmation dialog | Toast: "Marked sold." | `vehicle.sold` |
| Admin | Archive | UPDATE Vehicle | — | Vehicle → Archived | Confirmation dialog | Toast: "Archived." | `vehicle.archived` |

### 4.2 Owner Inquiry Actions

| Screen | Button/Action | Data Write/Update | Linked Records | Status Change | Validation | Result | Audit Event |
|--------|--------------|-------------------|----------------|---------------|------------|--------|-------------|
| `/admin/inquiries/[id]` | Mark Reviewed | UPDATE VehicleInquiry | — | Inquiry: New → Reviewed | — | Toast: "Marked reviewed." | `inquiry.reviewed` |
| `/admin/inquiries/[id]` | Mark Responded | UPDATE VehicleInquiry | — | Inquiry: → Responded | — | Toast: "Marked responded." | `inquiry.responded` |
| `/admin/inquiries/[id]` | Convert to Deal | CREATE Deal, UPDATE VehicleInquiry | Deal ↔ Vehicle, Deal ↔ Customer, Inquiry → Deal | Inquiry → Converted; Deal → Lead | Vehicle must be Listed. No duplicate deal for same customer+vehicle. | Modal → Toast: "Deal created." | `inquiry.converted`, `deal.created` |
| `/admin/inquiries/[id]` | Close Inquiry | UPDATE VehicleInquiry | — | Inquiry → Closed | Confirmation dialog | Toast: "Inquiry closed." | `inquiry.closed` |
| `/admin/inquiries/[id]` | Save Note | UPDATE VehicleInquiry (owner_notes) | — | — | — | Toast: "Note saved." | — |

### 4.3 Owner Vehicle Request Actions

| Screen | Button/Action | Data Write/Update | Linked Records | Status Change | Validation | Result | Audit Event |
|--------|--------------|-------------------|----------------|---------------|------------|--------|-------------|
| `/admin/requests/[id]` | Mark Under Review | UPDATE VehicleRequest | — | Request: Submitted → Under Review | — | Toast: "Under review." | `request.reviewed` |
| `/admin/requests/[id]` | Mark Sourcing | UPDATE VehicleRequest | — | Request: → Sourcing | — | Toast: "Sourcing started." | `request.sourcing_started` |
| `/admin/requests/[id]` | Add Proposal | CREATE VehicleProposal | Proposal ↔ Request | Request → Vehicle Proposed; Proposal → Proposed | Make, model, year, mileage, price required | Toast: "Proposal sent." | `proposal.created` |
| `/admin/requests/[id]` | Close Request | UPDATE VehicleRequest | — | Request → Closed | Confirmation dialog | Toast: "Request closed." | `request.closed` |
| Admin (after customer accepts) | Convert to Deal | CREATE Vehicle + CREATE Deal, UPDATE VehicleRequest | Deal ↔ Vehicle ↔ Customer ↔ Request | Request → Converted to Deal; Deal → Lead or Deposit Pending | — | Toast: "Converted to deal." | `request.converted`, `deal.created` |

### 4.4 Customer Public Actions

| Screen | Button/Action | Data Write/Update | Linked Records | Status Change | Validation | Result | Audit Event |
|--------|--------------|-------------------|----------------|---------------|------------|--------|-------------|
| VDP modal | Send Inquiry | CREATE VehicleInquiry (or UPDATE if duplicate) | Inquiry ↔ Vehicle. Stub Customer created if new email. | Inquiry → New | Name, email, phone required. Honeypot check. | Modal success: "Thanks! We'll reach out within 1 business day." | `inquiry.submitted` |
| `/inventory/[slug]/reserve` | Place Deposit | CREATE Deal (Deposit Pending), CREATE DealDeposit (PENDING), Stripe PaymentIntent | Deal ↔ Vehicle ↔ Customer. Deposit ↔ Deal. | Deal → Deposit Pending, then → Deposit Received (webhook). Vehicle → Reserved (webhook). | All form fields + agreement checkbox. Vehicle must be Listed (concurrency check). | Redirect → success page. | `deal.created`, `deposit.initiated`, `deposit.completed`, `vehicle.reserved` |
| `/request-vehicle` | Submit Request | CREATE VehicleRequest | Request ↔ Customer (stub if new) | Request → Submitted | Make, model, budget, name, email, phone required | Redirect → confirmation page | `request.submitted` |
| VDP modal | Submit Trade-In | CREATE TradeInCapture | TradeIn ↔ Vehicle (context), TradeIn ↔ Customer (by email) | — | Year, make, model, mileage, condition required | Modal success state | `tradein.submitted` |
| VDP modal | Submit Financing Interest | CREATE or UPDATE VehicleInquiry (financing flag) | Inquiry ↔ Vehicle | — | Name, email, phone required | Modal success state | `financing_interest.submitted` |
| Customer portal | Accept Proposal | UPDATE VehicleProposal | — | Proposal → Customer Accepted; Request → Customer Approved | — | Portal updates to show approval confirmation | `proposal.accepted` |
| Customer portal | Decline Proposal | UPDATE VehicleProposal | — | Proposal → Customer Declined | — | Portal updates | `proposal.declined` |
| Customer portal | Upload Document | CREATE DealDocument (UPLOADED) | Document ↔ Deal | Deal may transition based on completeness | Valid file type, max size | Toast: "Document uploaded." | `document.uploaded` |

---

## 5. Linking Rules

### 5.1 Customer Identity Resolution

A "customer" can interact with the platform before having an account.

| Interaction | Account Exists? | Behavior |
|-------------|----------------|----------|
| Submit inquiry | No | Stub Customer record created with name, email, phone. No password. No login. |
| Submit inquiry | Yes | Inquiry linked to existing Customer by email match. |
| Place deposit | No | Stub Customer created. After payment, customer is prompted to create full account (set password). |
| Place deposit | Yes | Deal linked to existing Customer. |
| Submit vehicle request | No | Stub Customer created. |
| Create account later | Stub exists | Email match links the new account to the existing stub. All records (inquiries, deposits, requests) are retroactively accessible in the portal. |

**Rule:** Customer identity is resolved by email address. Email is the primary key for identity resolution.

### 5.2 Inquiry → Lead → Deal Chain

```
VehicleInquiry (customer asks about a vehicle)
    → Owner reviews, may Convert to Deal
        → Deal created at "Lead" status
            → Customer places deposit → Deal moves to "Deposit Received"
```

An inquiry is NOT a deal. It is a lightweight interest signal. The owner explicitly decides when an inquiry warrants a deal record.

### 5.3 Multiple Inquiries from Same Email

* Same email + same vehicle within 24 hours: UPDATE existing inquiry (append message).
* Same email + same vehicle after 24 hours: CREATE new inquiry.
* Same email + different vehicle: CREATE new inquiry (always).
* All inquiries from the same email are visible on the customer's profile in admin.

### 5.4 Deposit → Reservation → Deal

```
Customer clicks "Reserve with Deposit"
    → Server creates Deal (Deposit Pending) + DealDeposit (PENDING)
    → Stripe processes payment
    → Webhook confirms → DealDeposit (SUCCEEDED), Deal (Deposit Received), Vehicle (Reserved)
```

* One vehicle can have at most ONE active reservation (one Deal in non-terminal state).
* If a deal is cancelled, the vehicle returns to Listed and can be reserved again.

### 5.5 Vehicle Request → Proposal → Vehicle → Deal

```
VehicleRequest (customer wants a specific car)
    → Owner creates VehicleProposal(s)
        → Customer accepts a proposal
            → Owner creates a Vehicle record (actual inventory)
            → Owner creates a Deal linking Customer + Vehicle
            → VehicleRequest → Converted to Deal
            → Customer enters standard deposit/purchase flow
```

* A VehicleRequest can have multiple proposals.
* Only one proposal can be accepted per request.
* Once converted, the request is terminal (Converted to Deal).

### 5.6 Trade-In Linkage

```
TradeInCapture
    → Linked to vehicle_id (the car the customer was viewing, nullable)
    → Linked by customer_email
    → Linked to inquiry_id (if submitted from same VDP session, nullable)
```

Trade-in captures are informational only. They do not trigger any automated workflow. The owner reviews them manually.

### 5.7 Deal ↔ Vehicle Lifecycle Coupling

| Deal Transition | Vehicle Transition |
|----------------|-------------------|
| Deposit Received | Vehicle → Reserved |
| Completed | Vehicle → Sold |
| Cancelled | Vehicle → Listed (if was Reserved/Under Contract) |

The Deal drives the Vehicle status. Vehicle status should never be changed independently when a Deal is active, except by the owner through explicit admin actions with appropriate warnings.

---

## 6. Entity Relationship Summary

```
Customer (1) ──→ (many) Deal
Customer (1) ──→ (many) VehicleInquiry
Customer (1) ──→ (many) VehicleRequest
Customer (1) ──→ (many) TradeInCapture
Customer (1) ──→ (many) EnergyServiceRequest

Vehicle (1) ──→ (many) VehicleMedia
Vehicle (1) ──→ (many) VehicleDocument
Vehicle (1) ──→ (many) VehicleInquiry
Vehicle (1) ──→ (many) Deal (though typically 1 active at a time)

Deal (1) ──→ (1) Vehicle
Deal (1) ──→ (1) Customer
Deal (1) ──→ (many) DealDocument
Deal (1) ──→ (1) DealDeposit
Deal (1) ──→ (many) DocuSignEnvelope
Deal (1) ──→ (many) EnergyServiceRequest (optional)

VehicleRequest (1) ──→ (1) Customer
VehicleRequest (1) ──→ (many) VehicleProposal

VehicleInquiry (1) ──→ (1) Vehicle
VehicleInquiry (many) ──→ (1) Customer (by email, may be stub)

ActivityEvent ──→ any entity (polymorphic via entity_type + entity_id)
```

---

## 7. Recommended Prisma Model Sketch

These are structural recommendations, not final schema. Field types and constraints should be validated during implementation.

```prisma
model Customer {
  id            String   @id @default(uuid())
  email         String   @unique
  firstName     String
  lastName      String
  phone         String?
  passwordHash  String?  // null for stub accounts
  emailVerified Boolean  @default(false)
  role          Role     @default(CUSTOMER)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  deals                Deal[]
  inquiries            VehicleInquiry[]
  vehicleRequests      VehicleRequest[]
  tradeInCaptures      TradeInCapture[]
  energyServiceRequests EnergyServiceRequest[]
}

model Vehicle {
  id                   String        @id @default(uuid())
  vin                  String        @unique
  year                 Int
  make                 String
  model                String
  trim                 String?
  mileage              Int
  drivetrain           Drivetrain
  batteryRangeEstimate Int?
  exteriorColor        String
  interiorColor        String
  condition            VehicleCondition
  titleStatus          TitleStatus
  price                Decimal
  description          String?
  highlights           String[]      // array of highlight strings
  features             String[]      // selected feature checklist items
  internalNotes        String?
  vehicleStatus        VehicleStatus @default(DRAFT)
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  media      VehicleMedia[]
  documents  VehicleDocument[]
  inquiries  VehicleInquiry[]
  deals      Deal[]
}

model VehicleMedia {
  id           String    @id @default(uuid())
  vehicleId    String
  mediaType    MediaType
  url          String
  displayOrder Int
  createdAt    DateTime  @default(now())

  vehicle Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
}

model VehicleDocument {
  id            String   @id @default(uuid())
  vehicleId     String
  documentLabel String
  fileUrl       String
  uploadedAt    DateTime @default(now())

  vehicle Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
}

model VehicleInquiry {
  id                String        @id @default(uuid())
  vehicleId         String
  customerName      String
  customerEmail     String
  customerPhone     String
  preferredContact  ContactMethod
  message           String?
  tradeInInterest   Boolean       @default(false)
  financingInterest Boolean       @default(false)
  inquiryStatus     InquiryStatus @default(NEW)
  ownerNotes        String?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  vehicle  Vehicle   @relation(fields: [vehicleId], references: [id])
  customer Customer? @relation(fields: [customerEmail], references: [email])
}

model TradeInCapture {
  id        String           @id @default(uuid())
  customerEmail String
  vehicleId String?          // the vehicle being viewed (context)
  inquiryId String?          // linked inquiry if applicable
  year      Int
  make      String
  model     String
  trim      String?
  mileage   Int
  vin       String?
  condition VehicleCondition
  notes     String?
  createdAt DateTime         @default(now())
}

model VehicleRequest {
  id            String              @id @default(uuid())
  customerId    String
  make          String
  model         String
  yearMin       Int?
  yearMax       Int?
  budgetMax     Decimal
  mileageMax    Int?
  colorPrefs    String?
  features      String?
  timeline      String?
  financingInterest Boolean         @default(false)
  tradeInInterest   Boolean         @default(false)
  notes         String?
  requestStatus VehicleRequestStatus @default(SUBMITTED)
  ownerNotes    String?
  priority      Priority?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  customer  Customer          @relation(fields: [customerId], references: [id])
  proposals VehicleProposal[]
}

model VehicleProposal {
  id             String         @id @default(uuid())
  requestId      String
  vin            String?
  make           String
  model          String
  year           Int
  mileage        Int
  estimatedPrice Decimal
  proposalStatus ProposalStatus @default(PROPOSED)
  notes          String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  request VehicleRequest @relation(fields: [requestId], references: [id])
}

model Deal {
  id            String     @id @default(uuid())
  vehicleId     String
  customerId    String
  dealStatus    DealStatus @default(LEAD)
  purchasePrice Decimal
  depositAmount Decimal?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  vehicle   Vehicle          @relation(fields: [vehicleId], references: [id])
  customer  Customer         @relation(fields: [customerId], references: [id])
  deposit   DealDeposit?
  documents DealDocument[]
  envelopes DocuSignEnvelope[]
}

model DealDeposit {
  id               String        @id @default(uuid())
  dealId           String        @unique
  stripePaymentId  String?
  depositAmount    Decimal
  paymentStatus    PaymentStatus @default(PENDING)
  paymentTimestamp DateTime?

  deal Deal @relation(fields: [dealId], references: [id])
}

model DealDocument {
  id             String         @id @default(uuid())
  dealId         String
  documentType   String
  documentStatus DocumentStatus @default(PENDING)
  fileUrl        String?
  createdAt      DateTime       @default(now())

  deal Deal @relation(fields: [dealId], references: [id])
}

model DocuSignEnvelope {
  id             String         @id @default(uuid())
  dealId         String
  envelopeId     String
  envelopeStatus EnvelopeStatus @default(SENT)
  sentAt         DateTime
  completedAt    DateTime?

  deal Deal @relation(fields: [dealId], references: [id])
}

model EnergyServiceRequest {
  id              String              @id @default(uuid())
  customerId      String
  dealId          String?
  serviceType     EnergyServiceType
  serviceStatus   EnergyServiceStatus @default(INTEREST_CAPTURED)
  propertyAddress String
  notes           String?
  createdAt       DateTime            @default(now())

  customer Customer @relation(fields: [customerId], references: [id])
}

model ActivityEvent {
  id         String   @id @default(uuid())
  eventType  String
  actorId    String?
  actorRole  Role?
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())
}

// --- ENUMS ---

enum Role {
  OWNER
  CUSTOMER
}

enum VehicleStatus {
  DRAFT
  LISTED
  RESERVED
  UNDER_CONTRACT
  SOLD
  ARCHIVED
}

enum Drivetrain {
  AWD
  RWD
  FWD
}

enum VehicleCondition {
  EXCELLENT
  GOOD
  FAIR
  POOR
}

enum TitleStatus {
  CLEAN
  SALVAGE
  REBUILT
  LEMON
}

enum MediaType {
  IMAGE
  VIDEO
}

enum InquiryStatus {
  NEW
  REVIEWED
  RESPONDED
  CONVERTED
  CLOSED
}

enum VehicleRequestStatus {
  SUBMITTED
  UNDER_REVIEW
  SOURCING
  VEHICLE_PROPOSED
  CUSTOMER_APPROVED
  CONVERTED_TO_DEAL
  CLOSED
}

enum ProposalStatus {
  PROPOSED
  CUSTOMER_ACCEPTED
  CUSTOMER_DECLINED
  EXPIRED
}

enum DealStatus {
  LEAD
  DEPOSIT_PENDING
  DEPOSIT_RECEIVED
  DOCUMENTS_PENDING
  CONTRACTS_SENT
  CONTRACTS_SIGNED
  FINANCING_PENDING
  READY_FOR_DELIVERY
  COMPLETED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

enum DocumentStatus {
  PENDING
  UPLOADED
  VERIFIED
  REJECTED
}

enum EnvelopeStatus {
  SENT
  DELIVERED
  COMPLETED
  VOIDED
}

enum ContactMethod {
  EMAIL
  PHONE
  EITHER
}

enum EnergyServiceType {
  EV_CHARGER
  SOLAR
}

enum EnergyServiceStatus {
  INTEREST_CAPTURED
  SUBMITTED_TO_BAYTECH
  ACKNOWLEDGED
  CONTACT_PENDING
  CLOSED
}

enum Priority {
  HIGH
  MEDIUM
  LOW
}
```

---

## 8. Audit Trail — Event Types

All significant actions produce an `ActivityEvent` record. Events are append-only and immutable.

### 8.1 Inventory Events
| Event Type | Trigger | Entity | Metadata |
|-----------|---------|--------|----------|
| `vehicle.created` | Owner saves new vehicle | Vehicle | `{ status }` |
| `vehicle.updated` | Owner edits vehicle | Vehicle | `{ changedFields: [...] }` |
| `vehicle.published` | Vehicle status → Listed | Vehicle | — |
| `vehicle.unpublished` | Vehicle status → Draft (from Listed) | Vehicle | — |
| `vehicle.reserved` | Vehicle status → Reserved | Vehicle | `{ dealId }` |
| `vehicle.reservation_released` | Vehicle status → Listed (from Reserved) | Vehicle | `{ dealId }` |
| `vehicle.under_contract` | Vehicle status → Under Contract | Vehicle | `{ dealId }` |
| `vehicle.sold` | Vehicle status → Sold | Vehicle | `{ dealId }` |
| `vehicle.archived` | Vehicle status → Archived | Vehicle | — |
| `vehicle.deleted` | Draft vehicle deleted | Vehicle | — |

### 8.2 Inquiry Events
| Event Type | Trigger | Entity | Metadata |
|-----------|---------|--------|----------|
| `inquiry.submitted` | Customer submits inquiry | VehicleInquiry | `{ vehicleId }` |
| `inquiry.reviewed` | Owner marks reviewed | VehicleInquiry | — |
| `inquiry.responded` | Owner marks responded | VehicleInquiry | — |
| `inquiry.converted` | Owner converts to deal | VehicleInquiry | `{ dealId }` |
| `inquiry.closed` | Owner closes inquiry | VehicleInquiry | — |

### 8.3 Deal Events
| Event Type | Trigger | Entity | Metadata |
|-----------|---------|--------|----------|
| `deal.created` | Deal record created | Deal | `{ vehicleId, customerId, source }` |
| `deal.status_changed` | Any deal status transition | Deal | `{ from, to }` |
| `deal.cancelled` | Deal cancelled | Deal | `{ reason }` |

### 8.4 Deposit Events
| Event Type | Trigger | Entity | Metadata |
|-----------|---------|--------|----------|
| `deposit.initiated` | PaymentIntent created | DealDeposit | `{ amount, stripePaymentId }` |
| `deposit.completed` | Stripe webhook confirms | DealDeposit | `{ stripePaymentId }` |
| `deposit.failed` | Stripe webhook reports failure | DealDeposit | `{ stripePaymentId, failureReason }` |
| `deposit.refunded` | Owner initiates refund | DealDeposit | `{ amount }` |

### 8.5 Document Events
| Event Type | Trigger | Entity | Metadata |
|-----------|---------|--------|----------|
| `document.uploaded` | Customer uploads file | DealDocument | `{ documentType }` |
| `document.verified` | Owner verifies document | DealDocument | — |
| `document.rejected` | Owner rejects document | DealDocument | `{ reason }` |
| `contract.initiated` | Owner sends DocuSign | DocuSignEnvelope | `{ envelopeId }` |
| `contract.completed` | DocuSign webhook confirms | DocuSignEnvelope | `{ envelopeId }` |

### 8.6 Vehicle Request Events
| Event Type | Trigger | Entity | Metadata |
|-----------|---------|--------|----------|
| `request.submitted` | Customer submits request | VehicleRequest | — |
| `request.reviewed` | Owner marks under review | VehicleRequest | — |
| `request.sourcing_started` | Owner marks sourcing | VehicleRequest | — |
| `request.closed` | Owner closes request | VehicleRequest | `{ reason }` |
| `request.converted` | Request → Converted to Deal | VehicleRequest | `{ dealId, vehicleId }` |
| `proposal.created` | Owner creates proposal | VehicleProposal | `{ requestId }` |
| `proposal.accepted` | Customer accepts | VehicleProposal | `{ requestId }` |
| `proposal.declined` | Customer declines | VehicleProposal | `{ requestId }` |

### 8.7 Supplementary Events
| Event Type | Trigger | Entity | Metadata |
|-----------|---------|--------|----------|
| `tradein.submitted` | Customer submits trade-in info | TradeInCapture | `{ vehicleId }` |
| `financing_interest.submitted` | Customer expresses financing interest | VehicleInquiry | `{ vehicleId }` |
| `baytech_lead.captured` | Energy service request created | EnergyServiceRequest | `{ serviceType, dealId }` |

---

## 9. Failure and Edge Case Handling

### 9.1 Duplicate Leads
**Scenario:** Same customer email submits multiple inquiries on different vehicles.
**Handling:** Each inquiry is a separate VehicleInquiry record. In admin, the owner can view all inquiries grouped by customer email to see the full picture. No automatic merging.

### 9.2 Payment Success but Status Update Failure
**Scenario:** Stripe confirms payment, but the server fails to update Deal/Vehicle status.
**Handling:** The Stripe webhook is retried by Stripe (up to ~20 times over 3 days). The webhook handler must be idempotent — if the status is already updated, it succeeds silently. A background reconciliation job (daily) checks for DealDeposit records with `SUCCEEDED` payment but Deal still in `Deposit Pending`, and corrects them.

### 9.3 Vehicle Sold While Customer is Viewing
**Scenario:** Customer is on a VDP; another customer reserves or the owner sells the vehicle.
**Handling:** The "Reserve with Deposit" action performs a server-side status check before creating the PaymentIntent. If the vehicle is no longer `Listed`, the server returns an error and the UI shows: "This vehicle is no longer available." No stale-cache-based reservations are possible because the check is server-side at the moment of action.

### 9.4 Photo Upload Partial Failure
**Scenario:** Customer or owner uploads 5 photos; 3 succeed, 2 fail.
**Handling:** Each photo uploads independently. Successful uploads show green check. Failed uploads show red badge with "Retry" button. The form can be saved with whatever photos succeeded. Failed uploads do not block the save.

### 9.5 Inquiry Submitted Without Existing Customer Record
**Scenario:** Anonymous visitor submits an inquiry.
**Handling:** A stub Customer record is created with the provided name, email, phone. `passwordHash` is null. If the visitor later creates an account with the same email, the stub is upgraded — password is set, email is verified, and all existing inquiries/requests are retroactively linked.

### 9.6 Owner Unpublishes a Vehicle with Active Inquiries
**Scenario:** Vehicle has 3 open inquiries, owner unpublishes it.
**Handling:** Vehicle moves to Draft. Inquiries remain linked and accessible in admin. No automatic notification to inquiry submitters. Owner can still view and respond to inquiries. The vehicle is no longer publicly visible.

### 9.7 Owner Unpublishes a Vehicle with Active Reservation
**Scenario:** Vehicle is Reserved (active deal with deposit), owner tries to unpublish.
**Handling:** The system prevents unpublishing a Reserved vehicle. The owner must first release the reservation (which may require refunding the deposit). Error message: "This vehicle has an active reservation. Release the reservation before unpublishing."

### 9.8 Customer Submits Request Then Finds Vehicle in Inventory
**Scenario:** Customer submits a "find me this car" request, then discovers the exact car is already listed.
**Handling:** These are independent flows. The customer can place a deposit on the listed vehicle AND have an open request. The owner should notice the overlap and close the request manually if the customer purchases from inventory.

---

## 10. Route Summary

### 10.1 Public Routes (No Auth)
| Route | Page |
|-------|------|
| `/` | Homepage |
| `/inventory` | Inventory listing |
| `/inventory/[slug]` | Vehicle detail page |
| `/inventory/[slug]/reserve` | Deposit/reservation page |
| `/request-vehicle` | Vehicle request form |
| `/request-vehicle/confirmation` | Request confirmation |
| `/reservation/[dealId]/confirmation` | Deposit success page |
| `/login` | Customer login |
| `/register` | Customer registration |

### 10.2 Customer Routes (Auth Required)
| Route | Page |
|-------|------|
| `/portal` | Customer dashboard |
| `/portal/deals/[id]` | Deal detail / milestone tracker |
| `/portal/requests/[id]` | Request detail / proposals |
| `/portal/documents` | Document upload center |

### 10.3 Owner Routes (Auth + 2FA Required)
| Route | Page |
|-------|------|
| `/admin` | Admin dashboard (overview) |
| `/admin/inventory` | Inventory list |
| `/admin/inventory/new` | Add vehicle |
| `/admin/inventory/[id]/edit` | Edit vehicle |
| `/admin/inquiries` | Inquiry list |
| `/admin/inquiries/[id]` | Inquiry detail |
| `/admin/requests` | Vehicle request list |
| `/admin/requests/[id]` | Request detail |
| `/admin/deals` | Deal list |
| `/admin/deals/[id]` | Deal detail |
| `/admin/trade-ins` | Trade-in submissions |
| `/admin/baytech` | Energy service leads |
| `/admin/settings` | Platform settings |

---

## 11. Component Breakdown

### 11.1 Shared Components
* `Toast` — notification feedback
* `ConfirmationDialog` — destructive action confirmation
* `StatusBadge` — colored status indicator
* `FileUploader` — drag-and-drop with progress
* `FormField` — label + input + validation message wrapper
* `EmptyState` — illustration + message + CTA
* `SkeletonLoader` — page-level loading placeholder
* `VehicleCard` — compact vehicle summary (used in grids, lists, references)

### 11.2 Customer Components
* `InventoryGrid` — responsive vehicle card grid
* `FilterBar` — horizontal filter controls
* `MobileFilterDrawer` — bottom sheet for mobile filters
* `MediaGallery` — hero image + thumbnails + lightbox
* `PricingPanel` — sticky price + CTAs
* `InquiryModal` — inquiry form dialog
* `TradeInModal` — trade-in capture dialog
* `FinancingModal` — financing interest dialog
* `MilestoneTracker` — visual deal progress bar
* `ReservationForm` — deposit page form + Stripe Elements
* `VehicleRequestForm` — sourcing request form
* `ProposalCard` — vehicle proposal with Accept/Decline

### 11.3 Owner Components
* `AdminLayout` — sidebar nav + header + content area
* `DataTable` — sortable, filterable table with actions
* `VehicleForm` — full vehicle creation/edit form
* `PhotoGrid` — reorderable photo management
* `InquiryDetail` — full inquiry view with notes and actions
* `RequestDetail` — request view with proposals and actions
* `DealDetail` — deal view with status management
* `ProposalModal` — create/edit proposal
* `StatusDropdown` — status transition action menu
* `OwnerNotes` — threaded internal notes area
* `ActivityLog` — chronological event list
