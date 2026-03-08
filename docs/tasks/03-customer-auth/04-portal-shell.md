Title: Task 03.04 - Customer Portal Shell
Purpose: Build the unified dashboard for customers to track their activity.
Files likely touched: src/app/portal/layout.tsx, src/app/portal/page.tsx, src/components/PortalNav.tsx
Implementation steps:
1. Create `src/app/portal/layout.tsx` with customer-specific navigation (Dashboard, Deals, Requests, Documents).
2. Implement `PortalNav.tsx` with a responsive sidebar or header.
3. Build the portal dashboard overview in `src/app/portal/page.tsx`.
Acceptance criteria:
- Portal layout renders correctly for authenticated customers.
- Navigation links correctly route to the specific portal sections.
Dependencies: Task 03.01, Task 01.04
Related epic: 03 — Customer Auth and Portal
Related acceptance tests: Scenario R (entry point)
