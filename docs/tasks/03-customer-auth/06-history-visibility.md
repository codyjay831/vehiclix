Title: Task 03.06 - Inquiries and Requests History
Purpose: Provide a read-only view of past customer interactions in the portal.
Files likely touched: src/app/portal/requests/page.tsx, src/app/portal/inquiries/page.tsx
Implementation steps:
1. Create list views for `VehicleRequest` and `VehicleInquiry` records linked to the customer.
2. Render status badges and key details for each history item.
3. Link to detail views for active requests (Epic 06).
Acceptance criteria:
- Customers can see all their past inquiries and requests in the portal.
- Data is correctly isolated to the logged-in customer.
Dependencies: Task 03.04
Related epic: 03 — Customer Auth and Portal
Related acceptance tests: Scenario R
