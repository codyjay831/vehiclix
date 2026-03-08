Title: Task 04.05 - Internal Document Upload
Purpose: Allow the owner to attach internal documents (e.g., inspection reports) to vehicles.
Files likely touched: src/components/VehicleDocumentManager.tsx, src/lib/actions/document.ts
Implementation steps:
1. Create a `VehicleDocumentManager.tsx` section in the vehicle edit page.
2. Implement file upload for `VehicleDocument` records (PDF, JPEG, PNG).
3. Ensure these documents are never exposed on customer-facing pages.
Acceptance criteria:
- Internal documents can be uploaded and associated with a vehicle.
- Documents are successfully stored and retrieved in the admin view.
- Internal documents are not accessible via public routes.
Dependencies: Task 04.02
Related epic: 04 — Owner Inventory Management
Related acceptance tests: None (admin-only feature)
