# Storage Provider Smoke Test Checklist

This checklist covers manual verification of the storage system in both Local and Google Cloud Storage (GCS) modes, including legacy compatibility.

## A. Local Mode Smoke Tests
*Environment: `STORAGE_PROVIDER=local`*

### 1. Inventory Media
- [ ] **Upload:** Add a vehicle with multiple photos.
- [ ] **Verify Storage:** Check `public/uploads/inventory/` for new files.
- [ ] **Render:** View the vehicle in admin and public UI. Verify images load from `/uploads/inventory/<key>`.

### 2. Private Documents
- [ ] **Upload:** As a Customer, upload a document (PDF/JPG/PNG) to a deal.
- [ ] **Verify Storage:** Check `storage/documents/` for new files.
- [ ] **Retrieval:** As an Owner, view the document in the Deal detail page.
- [ ] **Auth Protection:** Copy the document URL (e.g., `/api/documents/<id>`) and try to access it from an incognito window. Verify it returns `401 Unauthorized`.
- [ ] **Replacement Cleanup:** Upload a second file to the same document slot. Verify the first file is deleted from `storage/documents/`.

---

## B. GCS Mode Smoke Tests
*Environment: `STORAGE_PROVIDER=gcs`, `GCS_BUCKET_NAME=<bucket>`, `GCS_PROJECT_ID=<project>`*

### 1. Inventory Media
- [ ] **Upload:** Add a vehicle with multiple photos.
- [ ] **Verify Storage:** Check GCS bucket under `inventory/` prefix.
- [ ] **Render:** View the vehicle. Verify images load from `https://storage.googleapis.com/<bucket>/inventory/<key>`.
- [ ] **Publicity:** Verify the object in GCS has public read access (if bucket-level public access is not enabled).

### 2. Private Documents
- [ ] **Upload:** Upload a document as a customer.
- [ ] **Verify Storage:** Check GCS bucket under `documents/` prefix.
- [ ] **Retrieval:** View via the route. Verify it streams correctly.
- [ ] **Privacy:** Try to access the GCS object URL directly (e.g., `https://storage.googleapis.com/<bucket>/documents/<key>`). Verify it is **NOT** public.
- [ ] **Replacement Cleanup:** Replace a document. Verify the old object is deleted from GCS.

---

## C. Legacy Compatibility Tests
*These tests verify that old database values continue to resolve correctly.*

### 1. Media Legacy Shapes
- [ ] **Full URL:** Manually update a `VehicleMedia.url` to `https://placehold.co/600x400.png`. Verify it renders correctly in the UI.
- [ ] **Prefixed Local Path:** Update a `VehicleMedia.url` to `/uploads/inventory/test.jpg` (or `uploads/inventory/test.jpg`). Verify it resolves to the current provider's URL (e.g., `.../inventory/test.jpg`).
- [ ] **Bare Key:** Update a `VehicleMedia.url` to `test.jpg`. Verify it resolves correctly.

### 2. Document Legacy Shapes
- [ ] **Prefixed Path:** Update a `DealDocument.fileUrl` to `documents/legacy-test.pdf`. Verify it can be retrieved via `/api/documents/<id>`.
- [ ] **Bare Key:** Update a `DealDocument.fileUrl` to `legacy-test.pdf`. Verify it works.

---

## D. Cleanup Verification
- [ ] **Orphaned File Audit:** Delete a vehicle from the database. Note that storage files currently remain (known gap).
- [ ] **Document Replace:** Verify that replacing a document removes the old file from storage (fixed in this pass).
