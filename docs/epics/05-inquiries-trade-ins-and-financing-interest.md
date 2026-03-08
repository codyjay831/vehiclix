# 05 — Inquiries, Trade-Ins, and Financing Interest

## 1. Epic Title
Customer Lead Capture: Inquiries, Trade-Ins, and Financing Interest

## 2. Purpose
Standardize and manage all lightweight intent signals from customers, including specific vehicle questions, trade-in details, and financing interest.

## 3. User / Business Value
Captures high-intent leads even if the customer isn't ready to buy or place a deposit. Provides the owner with a unified view of lead activity to drive manual follow-ups and conversions.

## 4. Canon Dependencies
- `docs/canon/09` (Boundaries - No automation for trade-in/financing)
- `docs/canon/10` (Scenarios D, E, L, P, Q)
- `docs/canon/11` (Lead Linkage Rules)
- `docs/canon/12` (INQ, TRD Tests)

## 5. In Scope
- **Inquiry Modal (VDP):** Capture name, contact info, preferred method, and message.
- **Trade-In Modal:** Capture year, make, model, mileage, condition, and optional photos (Scenario P).
- **Financing Intent Modal:** Capture interest flag and credit score range (Scenario Q).
- **Owner Admin View (`/admin/inquiries`):**
  - Table of all inquiries with status badges.
  - Detail view for specific inquiries with threaded notes (Scenario D).
  - Status management: `New → Reviewed → Responded → Converted → Closed`.
- **Inquiry-to-Deal Conversion:** Modal to create a `Deal` from an inquiry (Scenario E).
- **Trade-In Admin View:** Dedicated list or tab to view trade-in submissions.

## 6. Out of Scope
- Automated valuation for trade-ins.
- Credit applications or SSN collection.
- Real-time chat.
- Email notifications to customers (deferred).

## 7. Actors
- Anonymous Visitor
- Customer
- Owner

## 8. Core Entities Touched
- `VehicleInquiry` (Financing interest is a flag on this record)
- `TradeInCapture`
- `Deal` (Created on conversion)
- `Customer` (Stub creation)

## 9. Main User Flows
- **Capture:** Customer submits an inquiry with a trade-in interest flag from a VDP (Scenario L).
- **Management:** Owner reviews the inquiry, adds a note "Called Jane - interested in Model 3," and marks as "Responded" (Scenario D).
- **Conversion:** Owner clicks "Convert to Deal" to initiate a formal purchase (Scenario E).

## 10. Owner/Admin Flows
- Filtering inquiries by "New" status to prioritize morning follow-ups.
- Reviewing trade-in photos before calling the customer.

## 11. States and Transitions
- Inquiry: `New → Reviewed → Responded → Converted → Closed`.
- Vehicle: Remains `Listed` until a deposit is placed (unless owner manually reserves).

## 12. UI Surfaces
- VDP Modals (`InquiryModal`, `TradeInModal`, `FinancingModal`)
- `/admin/inquiries` (List + Detail)
- `DealConversionModal`

## 13. API / Backend Responsibilities
- Form validation (PII, honeypot).
- Identity resolution (check email, merge into customer profile).
- Conversion logic (create Deal, link Inquiry, update Status).
- Image storage for trade-in photos.

## 14. Security / Audit Requirements
- Rate limiting on all modals.
- Audit Logging: `inquiry.submitted`, `inquiry.reviewed`, `inquiry.converted`.
- Protection: Inquiries are non-public data (Owner-only access).

## 15. Acceptance Criteria
- [ ] Inquiry submission creates `VehicleInquiry` and stub `Customer` (Test INQ-001).
- [ ] Owner can mark inquiry "Reviewed" and "Responded" (Test INQ-004).
- [ ] "Convert to Deal" creates a linked `Deal` record (Test INQ-005).
- [ ] Trade-in info is captured correctly without automated valuation (Test TRD-001).
- [ ] Financing interest is captured as intent only (Test TRD-002).

## 16. Edge Cases / Failure Cases
- **Duplicate Inquiries:** Multiple inquiries for the same vehicle/email within 24h update the existing record (Doc 11, 5.3).
- **Orphaned Trade-Ins:** If a trade-in is submitted without an inquiry, it still appears in the admin trade-in list linked by email.

## 17. Dependencies on Other Epics
- `Epic 01` (Foundation).
- `Epic 02` (VDP CTAs).

## 18. Deferred Items / Notes
- Automated email alerts for new inquiries.
- Multi-step inquiry wizard.
