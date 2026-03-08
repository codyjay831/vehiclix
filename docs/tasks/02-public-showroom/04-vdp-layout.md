Title: Task 02.04 - Vehicle Detail Page (VDP) Layout
Purpose: Create the detail view for a specific vehicle with media gallery and specs.
Files likely touched: src/app/inventory/[slug]/page.tsx, src/components/MediaGallery.tsx
Implementation steps:
1. Create `src/app/inventory/[slug]/page.tsx` using `generateMetadata` for SEO (Doc 10, Scenario K).
2. Implement `MediaGallery.tsx` with a hero image, thumbnails, and a lightbox.
3. Render the vehicle specs grid with icons for mileage, range, etc.
4. Include the rich text description and feature checklist.
Acceptance criteria:
- VDP renders all vehicle data correctly (Test BRW-006).
- Media gallery functions with thumbnail selection and lightbox.
- SEO tags are generated correctly.
Dependencies: Task 02.02, Task 01.04
Related epic: 02 — Public Showroom and Content
Related acceptance tests: BRW-006
