Title: Task 02.03 - Inventory Filters & Search
Purpose: Add filtering and sorting to the inventory page with URL persistence.
Files likely touched: src/app/inventory/page.tsx, src/components/FilterBar.tsx
Implementation steps:
1. Create `FilterBar.tsx` with Make, Price, Year, and Drivetrain filters (Doc 10, Scenario J).
2. Use Next.js `useSearchParams` to sync filters with the URL.
3. Add a "Clear All" button to reset the URL params.
4. Implement mobile-only filter drawer (Doc 08, 10).
Acceptance criteria:
- Filters update the URL query params correctly (Test BRW-002).
- Filters persist across page refresh (Test BRW-003).
- "Clear All" resets the filter state.
Dependencies: Task 02.02
Related epic: 02 — Public Showroom and Content
Related acceptance tests: BRW-002, BRW-003
