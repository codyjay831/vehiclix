# Storage Smoke Test Checklist

Use this checklist to verify storage behavior in **local** and **GCS** modes after deployment or config changes. Run manually; check each item that passes.

---

## A. Local mode (`STORAGE_PROVIDER=local` or unset)

| # | Test | Steps | Pass |
|---|------|--------|------|
| A1 | Inventory upload | Create/edit a vehicle, add at least one photo, save. Confirm no server error. | ☐ |
| A2 | Inventory render | View admin inventory list and public listing; vehicle thumbnail/primary image loads. | ☐ |
| A3 | Document upload | As customer, upload a document (PDF/JPEG/PNG) for a deal. Confirm success. | ☐ |
| A4 | Document retrieval | As same customer (or authorized owner), open document view and download/open the file. | ☐ |
| A5 | Auth protection for documents | While logged out (or as different user without access), request `/api/documents/[id]` for a real document ID. Expect 401 or 403. | ☐ |

---

## B. GCS mode (`STORAGE_PROVIDER=gcs`, `GCS_BUCKET_NAME` set)

| # | Test | Steps | Pass |
|---|------|--------|------|
| B1 | Inventory upload | Create/edit a vehicle, add at least one photo, save. Confirm no server error. | ☐ |
| B2 | Inventory render via public URL | View admin and public inventory; images load from GCS (e.g. `storage.googleapis.com/...`). | ☐ |
| B3 | Document upload | As customer, upload a document for a deal. Confirm success. | ☐ |
| B4 | Document retrieval through route | As authorized user, open document via app (not direct GCS URL). File streams correctly. | ☐ |
| B5 | Private docs not directly public | Copy the document stream URL from the app; ensure the underlying GCS object is in a private path (e.g. `documents/`) and that bucket IAM does not allow public read on that prefix. Direct `https://storage.googleapis.com/.../documents/...` without app auth should fail or be inaccessible. | ☐ |
| B6 | Public inventory readable | Confirm listed vehicles’ images are reachable (e.g. public URL or bucket has appropriate IAM/cors for inventory prefix). If design is “public read for inventory”, verify in browser. | ☐ |

**Note:** GCS IAM and bucket CORS must be configured separately; this checklist does not assume they are correct.

---

## C. Legacy compatibility

Use DB or fixtures to set legacy values (or temporarily patch a row), then verify behavior.

| # | Test | Setup | Expected | Pass |
|---|------|--------|----------|------|
| C1 | Media row — full URL | Set `VehicleMedia.url` to a full URL (e.g. `https://storage.googleapis.com/bucket/inventory/legacy.jpg`). | Image renders with that URL; no double-prefixing. | ☐ |
| C2 | Media row — local path | Set `VehicleMedia.url` to `/uploads/inventory/foo.jpg` or `uploads/inventory/foo.jpg`. | Image resolves and displays (local: same path; GCS: provider builds URL from key `foo.jpg`). | ☐ |
| C3 | Media row — bare key | Set `VehicleMedia.url` to a bare key (e.g. `uuid.jpg`). | Image loads via active provider’s public URL. | ☐ |
| C4 | Document row — bare key | Ensure a `DealDocument.fileUrl` is a bare key (e.g. `uuid.pdf`). | Document retrieval streams the file. | ☐ |
| C5 | Document row — prefixed legacy path | Set `DealDocument.fileUrl` to `documents/uuid.pdf` or `/documents/uuid.pdf`. | Document retrieval still streams (key normalized to bare key before provider read). | ☐ |

---

## Quick reference

- **Public inventory:** Resolved via `getPublicUrl()` (used in `enrichVehicleMedia`). Legacy full URLs and paths supported.
- **Private documents:** Served by `GET /api/documents/[id]`; uses `getReadStream(fileUrl)`. Legacy prefixed paths normalized to key.
- **Cleanup:** Document replace deletes previous file. Vehicle/media delete does not yet remove storage files (see code comments in `src/actions/inventory.ts`).
