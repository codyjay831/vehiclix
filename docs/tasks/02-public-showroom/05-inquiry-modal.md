Title: Task 02.05 - Inquiry Modal
Purpose: Capture customer questions from the VDP with validation and stub identity resolution.
Files likely touched: src/components/InquiryModal.tsx, src/lib/actions/inquiry.ts
Implementation steps:
1. Create `InquiryModal.tsx` with name, email, phone, and message fields (Doc 10, Scenario L).
2. Implement a server action `submitInquiry` that:
   - Validates all fields and a honeypot check.
   - Checks for an existing `Customer` or creates a stub.
   - Creates a `VehicleInquiry` record linked to the vehicle.
3. Show a success state in the modal upon submission.
Acceptance criteria:
- Inquiry submission creates a `VehicleInquiry` and stub `Customer` (Test INQ-001).
- Duplicate inquiries (same email + vehicle within 24h) update the existing record (Doc 11, 5.3, Test INQ-003).
Dependencies: Task 02.04, Task 01.03
Related epic: 02 — Public Showroom and Content
Related acceptance tests: INQ-001, INQ-003
