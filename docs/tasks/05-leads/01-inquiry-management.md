Title: Task 05.01 - Inquiry List and Detail (Admin)
Purpose: Allow the owner to view and manage customer inquiries in a centralized list.
Files likely touched: src/app/admin/inquiries/page.tsx, src/app/admin/inquiries/[id]/page.tsx, src/components/InquiryList.tsx
Implementation steps:
1. Create `src/app/admin/inquiries/page.tsx` with a data table of all `VehicleInquiry` records.
2. Implement `InquiryList.tsx` with columns for date, name, email, vehicle, status, and a "View" button.
3. Create `src/app/admin/inquiries/[id]/page.tsx` for the detail view (Doc 10, Scenario D).
4. Render the inquiry message, linked vehicle summary, customer contact info, and status.
Acceptance criteria:
- Admin inquiries list displays all submissions correctly.
- Clicking an inquiry opens the detail view with full context.
Dependencies: Task 02.05, Task 01.03
Related epic: 05 — Inquiries, Trade-Ins, and Financing Interest
Related acceptance tests: INQ-004
