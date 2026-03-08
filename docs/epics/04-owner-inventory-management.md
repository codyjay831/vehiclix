# 04 — Owner Inventory Management

## 1. Epic Title
Owner Inventory Management and Media Handling

## 2. Purpose
Empower the dealership owner to manage the vehicle lifecycle, from initial preparation (Draft) to active sales (Listed) and historical archiving.

## 3. User / Business Value
Centralizes inventory operations for the solo dealer. High-quality media management and clear status control are essential for maintaining the "premium curated" value proposition.

## 4. Canon Dependencies
- `docs/canon/04` (Inventory Domain)
- `docs/canon/08` (Admin UX Rules)
- `docs/canon/10` (Scenarios A, B, C, F)
- `docs/canon/11` (Inventory Actions)
- `docs/canon/12` (INV Tests)

## 5. In Scope
- **Admin Inventory List (`/admin/inventory`):**
  - Table view of all vehicles (Draft, Listed, Reserved, etc.).
  - Status badges and action menus.
  - Sorting and status filtering.
- **Vehicle Form (`/admin/inventory/new` & `/edit`):**
  - Multi-section form (Scenario A).
  - Draft vs. Publish logic.
  - Validation rules for VIN, Mileage, Price.
  - Rich description editor.
- **Media Management:**
  - Drag-and-drop photo uploader with progress (Scenario F).
  - Reorderable grid (drag handle).
  - Primary photo selection (star icon).
  - Video walkthrough URL embed field.
- **Internal Tools:**
  - Internal-only owner notes per vehicle.
  - Internal-only document uploads (inspection reports, etc.).
  - Archived vehicles filter.

## 6. Out of Scope
- Automatic VIN decoding (Doc 04).
- Deal creation from inventory (Epic 07).
- Public-facing VDP rendering (Epic 02).

## 7. Actors
- Owner

## 8. Core Entities Touched
- `Vehicle`
- `VehicleMedia`
- `VehicleDocument` (Internal)

## 9. Main User Flows
- **Preparation:** Owner creates a vehicle draft and uploads 10 photos (Scenario A).
- **Launch:** Owner fills description and publishes the vehicle (Scenario B).
- **Archiving:** Owner moves a sold or stale vehicle to archived status (Scenario C).

## 10. Owner/Admin Flows
- Managing the photo display order to ensure the best angle is first.
- Attaching internal inspection PDFs to the vehicle record.

## 11. States and Transitions
- `Draft → Listed → Reserved → Under Contract → Sold → Archived`.
- Manual unpublish: `Listed → Draft`.

## 12. UI Surfaces
- `/admin/inventory` (Table)
- `/admin/inventory/[id]/edit` (Form + Photo Grid)
- `StatusDropdown` component.

## 13. API / Backend Responsibilities
- Atomic status updates with confirmation validation.
- Secure photo storage (S3/Signed URL for admin uploads).
- VIN uniqueness enforcement.
- Validation logic: `Publish` requires description and ≥1 photo.

## 14. Security / Audit Requirements
- Strictly `/admin` route protection (Owner role only).
- Mandatory 2FA for all status-changing actions.
- Audit Logging: `vehicle.created`, `vehicle.published`, `vehicle.updated`, `vehicle.archived`.

## 15. Acceptance Criteria
- [ ] Owner can create a draft with only VIN/Year/Make/Model (Test INV-001).
- [ ] Publish fails if description or photos are missing (Test INV-002).
- [ ] Photos can be reordered and primary image set (Test INV-003).
- [ ] Unpublishing a vehicle removes it from the public site immediately (Test INV-009).
- [ ] Reserved vehicles cannot be unpublished (Test INV-010).

## 16. Edge Cases / Failure Cases
- **Upload Failures:** Individual photo failures show a retry button without failing the whole form.
- **Navigation with Unsaved Changes:** Browser-level "Dirty state" warning (Doc 10, 3.6).

## 17. Dependencies on Other Epics
- `Epic 01` (Prisma schema, 2FA shell).

## 18. Deferred Items / Notes
- Batch photo editing (cropping/filters).
- Multi-user inventory permissions.
