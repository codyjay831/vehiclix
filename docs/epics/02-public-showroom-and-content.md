# 02 — Public Showroom and Content

## 1. Epic Title
Public Showroom: Inventory Browsing and Vehicle Details

## 2. Purpose
Deliver a premium, Tesla-like public interface for browsing and inspecting electric vehicles. This epic covers the first half of the customer journey: discovery, selection, and intent capture.

## 3. User / Business Value
The public showroom is the "digital face" of Evo Motors. A high-trust, media-first experience (VDP) reduces customer anxiety and converts anonymous visitors into high-intent leads or reservation-holders.

## 4. Canon Dependencies
- `docs/canon/04` (Inventory Domain)
- `docs/canon/08` (UX Design Rules - Customer-facing)
- `docs/canon/10` (Scenarios I, J, K, L)
- `docs/canon/11` (Data Mapping - Public Actions)

## 5. In Scope
- **Homepage:** Premium hero section, featured inventory teaser, EV education section.
- **Inventory Page (`/inventory`):**
  - Responsive card grid (Listed vehicles only).
  - Filtering by Make, Price, Year, Drivetrain (URL param persistence).
  - Sorting (Newest, Price, Mileage).
  - Mobile filter drawer.
  - Empty and No-Results states.
- **Vehicle Detail Page (VDP):**
  - High-res media gallery with lightbox.
  - Sticky pricing and CTA panel.
  - Vehicle specs grid with icons.
  - Rich text description and feature checklist.
  - Intent capture CTAs: "Reserve with Deposit", "Ask About Vehicle", "Trade-In", "Financing".
- **Content Pages:** EV Incentives, Rebate education, About Evo Motors.
- **Lead Capture:** Inquiry modal (Scenario L).

## 6. Out of Scope
- Reservation payment flow (Epic 08).
- Trade-in or Financing data capture (Epic 05).
- Sourcing request form (Epic 06).

## 7. Actors
- Anonymous Visitor
- Customer

## 8. Core Entities Touched
- `Vehicle` (Read-only, `status = LISTED`)
- `VehicleMedia`
- `VehicleInquiry` (Created via modal)

## 9. Main User Flows
- **Discovery:** Visitor lands on `/inventory`, filters to a specific make/price.
- **Inspection:** Visitor clicks "View Details" (Scenario K).
- **Inquiry:** Visitor submits a question (Scenario L).

## 10. Owner/Admin Flows
- None (This epic is public-facing).

## 11. States and Transitions
- Inquiry: `New` status on creation.

## 12. UI Surfaces
- `/inventory` (Grid, Filters, Sorting)
- `/inventory/[slug]` (Gallery, Specs, Sticky CTA)
- `InquiryModal` (Form + Success state)

## 13. API / Backend Responsibilities
- Efficient querying of `Listed` vehicles with filters.
- `slug` generation logic (Year-Make-Model-VIN).
- Inquiry submission endpoint with honeypot spam prevention.
- Identity resolution (check for existing email).

## 14. Security / Audit Requirements
- Rate limiting on inquiry submissions.
- Public read-only access to `Listed` vehicles.
- No PII in URLs (use slugs).
- Audit: `inquiry.submitted` event.

## 15. Acceptance Criteria
- [ ] Only `vehicleStatus = LISTED` vehicles appear on `/inventory`.
- [ ] Filters update URL query params and persist on refresh (Test BRW-002, BRW-003).
- [ ] VDP renders gallery and sticky CTA panel correctly on mobile and desktop.
- [ ] Inquiry submission creates `VehicleInquiry` and stub `Customer` (Test INQ-001).
- [ ] Inquiry duplicate handling works within 24h window (Test INQ-003).

## 16. Edge Cases / Failure Cases
- **Sold/Reserved vehicle access:** Direct URL navigation to a non-listed vehicle shows a graceful "No longer available" message (Test BRW-007).
- **Empty Inventory:** `/inventory` shows a CTA to "Request a Vehicle" if 0 cars listed (Test BRW-004).

## 17. Dependencies on Other Epics
- `Epic 01` (Prisma schema, base UI components).

## 18. Deferred Items / Notes
- Video walkthrough embeds (optional MVP enhancement).
- Advanced search facets (deferred per Doc 09).
