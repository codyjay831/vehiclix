Title: Task 04.03 - Photo Upload and Reorder
Purpose: Allow the owner to manage vehicle photos with drag-and-drop and reordering.
Files likely touched: src/components/PhotoManager.tsx, src/lib/actions/media.ts
Implementation steps:
1. Implement a `PhotoManager.tsx` component with a drag-and-drop upload zone (Doc 10, Scenario F).
2. Use `VehicleMedia` records to track image URLs and `displayOrder`.
3. Implement a reorderable grid using `dnd-kit` or similar.
4. Add functionality to set a primary image (star icon) and delete photos (trash icon).
Acceptance criteria:
- Photos upload with progress bars (Doc 10, Scenario F).
- Reordering photos updates `displayOrder` in the database (Test INV-003).
- Primary image is correctly identified and set.
Dependencies: Task 04.02
Related epic: 04 — Owner Inventory Management
Related acceptance tests: INV-003, INV-006 (media verification)
