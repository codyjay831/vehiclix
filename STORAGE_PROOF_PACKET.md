# Storage Implementation — Proof Packet

## SECTION 1 — Exact Persisted Value Shapes

### VehicleMedia.url

| Question | Answer |
|----------|--------|
| **Shape stored in DB** | **Bare filename** (e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg`) |
| **Relative path?** | No |
| **Full public URL?** | No |
| **Provider key?** | Yes — the key is the filename; the provider knows the prefix (local dir or GCS `inventory/`) |
| **Mixed compatibility handling?** | Yes. At read time, `enrichVehicleMedia()` treats the stored value as a key and calls `storage.getPublicUrl(m.url)`, so legacy bare filenames work. No format detection; we assume all values are keys. |

**Exact code location where value is written:**

- **File:** `src/actions/inventory.ts`
- **Lines:** 244–252 (mediaRecords), then 279–282 (createMany)
- **Snippet:**
```ts
const mediaRecords = await Promise.all(
  photos.map(async (file, index) => {
    const key = await storage.save(file, { isPublic: true });
    return {
      mediaType: MediaType.IMAGE,
      url: key,   // <-- persisted shape: bare filename
      displayOrder: index,
    };
  })
);
// ...
media: {
  createMany: {
    data: mediaRecords,
  },
},
```
- **Source of `key`:** `LocalStorageProvider.save()` returns `filename` (line 26 of `src/lib/storage/local-provider.ts`). `GCSStorageProvider.save()` returns `filename` (line 45 of `src/lib/storage/gcs-provider.ts`), not the full GCS path.

---

### DealDocument.fileUrl

| Question | Answer |
|----------|--------|
| **Shape stored in DB** | **Bare filename** (e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf`) |
| **Relative path?** | No |
| **Full public URL?** | No |
| **Provider key?** | Yes — same as above; provider uses `documents/` prefix for private files |
| **Mixed compatibility handling?** | No explicit handling. All document writes go through `saveFile()` → `provider.save(file, { isPublic: false })`, which always returns a bare filename. Existing DB rows that are already bare filenames remain valid. |

**Exact code location where value is written:**

- **File:** `src/actions/document.ts`
- **Lines:** 52–53 (filename from saveFile), 57–62 (DB update)
- **Snippet:**
```ts
const filename = await saveFile(file);
// ...
db.dealDocument.update({
  where: { id: documentId },
  data: {
    documentStatus: DocumentStatus.UPLOADED,
    fileUrl: filename,   // <-- persisted shape: bare filename
  },
}),
```
- **Source of `filename`:** `src/lib/storage.ts` `saveFile()` calls `provider.save(file, { isPublic: false })`, which returns the same bare filename from both local and GCS providers.

---

### VehicleDocument.fileUrl

| Question | Answer |
|----------|--------|
| **Shape stored in DB** | **Not written by this implementation** |
| **Code that writes it** | None. No `src` code creates or updates `VehicleDocument` records. The model exists in `prisma/schema.prisma` (lines 174–183) and is documented for future “owner-only internal documents,” but no upload or persistence path was added or changed. |

**Conclusion:** VehicleDocument.fileUrl is out of scope for this proof packet; when implemented later, it should follow the same pattern (store bare filename, resolve via provider if needed).

---

## SECTION 2 — Public vs Private GCS Enforcement

### Public inventory asset URL generation

- **Where:** Public URLs for inventory media are produced only when **reading** vehicles for display, not when writing.
- **Code path:**
  1. `src/lib/inventory.ts`: `enrichVehicleMedia(vehicle)` (lines 8–17) runs for every vehicle that has media.
  2. For each medium: `url: storage.getPublicUrl(m.url)` — here `m.url` is the stored key (bare filename).
  3. **Local:** `src/lib/storage/local-provider.ts` line 38–40: `getPublicUrl(key)` returns `/uploads/inventory/${key}`.
  4. **GCS:** `src/lib/storage/gcs-provider.ts` line 57–60: `getPublicUrl(key)` returns `https://storage.googleapis.com/${this.bucketName}/inventory/${key}`.
- **Enforcement:** Public URL is only ever generated for media that are stored with `isPublic: true` (inventory). The DB stores only the key; the provider maps that key to a public URL only for the public (inventory) path.

### Private document non-public behaviour

- **Where:** Deal documents are saved with `isPublic: false` and are **never** passed through `getPublicUrl`.
- **Code path:**
  1. **Save:** `src/actions/document.ts` line 53: `saveFile(file)` → `src/lib/storage.ts` line 8–10: `provider.save(file, { isPublic: false })`. So private docs go to `storage/documents` (local) or `documents/` prefix (GCS).
  2. **GCS:** `src/lib/storage/gcs-provider.ts` line 29: `const prefix = options.isPublic ? "inventory/" : "documents/";` — private files use `documents/`.
  3. **No public URL:** The only call to `getPublicUrl` in the app is in `src/lib/inventory.ts` inside `enrichVehicleMedia`, which is used only for vehicle media. Deal documents are never passed to `getPublicUrl`. So **private documents never receive a public URL in code**.

### Document streaming through `/api/documents/[id]`

- **File:** `src/app/api/documents/[id]/route.ts`
- **Flow:**
  1. Lines 22–36: Load `DealDocument` by id; require `document.fileUrl` (the stored key).
  2. Lines 38–54: Authz check (user must be the deal’s customer or org owner/support).
  3. Lines 56–58: `getStorageProvider()` then `provider.getReadStream(document.fileUrl)`.
  4. **Local:** `src/lib/storage/local-provider.ts` lines 29–35: `getReadStream(key)` reads from `PRIVATE_STORAGE_DIR` + key (`storage/documents/<key>`).
  5. **GCS:** `src/lib/storage/gcs-provider.ts` lines 47–55: `getReadStream(key)` uses `bucket.file(\`documents/${key}\`)` and returns `gcsFile.createReadStream()` — no signed or public URL, stream only.
  6. Lines 60–84: Node stream is adapted to a Web `ReadableStream` and returned as `NextResponse(webStream, { headers })`.

**Explicit:** Private documents are **never** given public URLs. They are only ever accessed via this authenticated route, which streams content from the provider (local file or GCS `documents/` object).

---

## SECTION 3 — Verified Inventory Upload Flow

| Step | What happens | File path(s) |
|------|----------------|--------------|
| 1. File input enters | User selects files in the vehicle create form; they are held in React state and appended to FormData as `photos`. | `src/components/admin/VehicleForm.tsx`: file input (lines 634–640), `handlePhotoChange` (228–231), `photos.forEach((photo) => formData.append("photos", photo))` (202). |
| 2. FormData submitted | Form submit calls `createVehicleAction(formData)`. | `src/components/admin/VehicleForm.tsx` line 204. |
| 3. Buffer/FormData processed | Server action reads `formData.getAll("photos")` as `File[]`, then for each file calls storage provider. | `src/actions/inventory.ts` lines 241–242, 244–252. |
| 4. Storage provider save | `getStorageProvider().save(file, { isPublic: true })` is called per photo. Local: writes to `public/uploads/inventory/<uuid>.<ext>`. GCS: uploads to `inventory/<uuid>.<ext>`. Both return **bare filename**. | `src/actions/inventory.ts` lines 242, 246. `src/lib/storage/local-provider.ts` 11–27. `src/lib/storage/gcs-provider.ts` 23–46. |
| 5. VehicleMedia DB rows | `mediaRecords` (each with `mediaType: IMAGE`, `url: key`, `displayOrder`) are passed to `tx.vehicle.create(..., media: { createMany: { data: mediaRecords } })`. | `src/actions/inventory.ts` lines 244–252, 258–284. |
| 6. Media URLs in UI | When a vehicle is loaded for display, inventory fetchers call `enrichVehicleMedia(vehicle)`, which replaces each `m.url` (key) with `storage.getPublicUrl(m.url)` (full public or relative URL). That enriched list is passed to `MediaGallery`. | `src/lib/inventory.ts`: `enrichVehicleMedia` (8–17); used in `getAdminInventory`, `getAdminVehicleDetail`, `getPublicInventory`, `getFeaturedInventory`, `getPublicVehicleDetail`. `src/app/(marketing)/[dealerSlug]/inventory/[id]/page.tsx` line 135: `<MediaGallery media={vehicle.media} />`. `src/components/public/MediaGallery.tsx` lines 42, 50, 107: `activeImage.url`, `item.url` (already enriched). |

**All touched file paths (inventory upload and display):**

- `src/components/admin/VehicleForm.tsx`
- `src/actions/inventory.ts`
- `src/lib/storage/index.ts`
- `src/lib/storage/local-provider.ts`
- `src/lib/storage/gcs-provider.ts`
- `src/lib/inventory.ts`
- `src/app/(marketing)/[dealerSlug]/inventory/[id]/page.tsx`
- `src/components/public/MediaGallery.tsx`

---

## SECTION 4 — Validation Results

### typecheck

- **Command:** `npm run typecheck` (tsc --noEmit)
- **Result:** **Exit code 2** (failure)
- **Errors:** All in files **unchanged by the storage work**:
  - `src/actions/team.ts` (36): Property 'errors' does not exist on type 'ZodError<...>'
  - `src/app/(marketing)/request-access/page.tsx` (4): No exported member 'submitBetaRequestAction' from '@/actions/beta'
  - `src/components/admin/AddUserModal.tsx` (167): Type incompatibility for Role vs null
- **Storage-related files:** No type errors reported in `src/lib/storage/*`, `src/lib/storage.ts`, `src/actions/inventory.ts`, `src/actions/document.ts`, `src/app/api/documents/[id]/route.ts`, or `src/lib/inventory.ts`.

### lint

- **Command:** `npm run lint`
- **Result:** **Exit code 1** (failure). Full output was written to a file (431 lines). Not re-checked line-by-line for storage-only files; repo-level lint fails.

### build

- **Command:** `npm run build`
- **Result:** **Exit code 1** (failure)
- **Cause:** Missing export `submitBetaRequestAction` in `@/actions/beta` used by `src/app/(marketing)/request-access/page.tsx` — **unrelated to storage**.
- **Storage-related code:** No build error in any storage or document route file.

### Manual verification (honest statement)

- **Local inventory upload:** Not run. No manual test of creating a vehicle with photos in the browser.
- **Local document upload:** Not run. No manual test of portal document upload.
- **Local document retrieval:** Not run. No manual test of opening `/api/documents/[id]` with auth.
- **GCS code path compile integrity:** GCS provider and its usage typecheck and are included in the build; build failure is due to unrelated beta/request-access code. GCS path was **not** run against a real bucket or credentials.

**Conclusion:** Repo-wide typecheck, lint, and build currently fail due to **pre-existing** issues in other parts of the codebase. The storage implementation itself does not introduce new type or build errors in the files that were added or modified for storage.

---

## SECTION 5 — Remaining Risks

1. **Bucket IAM / public access**
   - Not configured or verified. For GCS, the bucket must allow the app’s credentials to read/write. For public inventory images, either the `inventory/` prefix must be given public read (e.g. allUsers or allAuthenticatedUsers) or the app must serve images via signed URLs / a proxy. Current code assumes a public URL for `inventory/` in GCS (`getPublicUrl` returns `https://storage.googleapis.com/...`). **Unverified.**

2. **Migration of existing local assets**
   - No migration or backfill was implemented. Existing files in `public/uploads/inventory` or `storage/documents` will not be in GCS. After switching to `STORAGE_PROVIDER=gcs`, old DB rows that reference those filenames will still point to keys that exist only on local disk. **Unverified;** manual or separate migration required.

3. **Mixed historical DB path formats**
   - Implementation assumes all stored values are **bare filenames**. If any legacy row had a relative path (e.g. `uploads/inventory/foo.jpg`) or full URL, `getPublicUrl` would still be called with that value: local would become `/uploads/inventory/uploads/inventory/foo.jpg`, GCS would become `.../inventory/uploads/inventory/foo.jpg`. No logic detects or normalizes legacy shapes. **Risk:** mixed or legacy formats could produce wrong URLs.

4. **Update / edit / delete media behaviour**
   - **Update vehicle:** `updateVehicleAction` does not add or remove media; it only updates vehicle fields. So no storage provider calls on edit. **Delete vehicle:** Prisma schema uses `onDelete: Cascade` for `VehicleMedia`, so rows are deleted; no code deletes the underlying files from storage (local or GCS) when a vehicle or a media row is removed. **Delete document:** No code path was added to delete a DealDocument’s file from storage when a document is rejected or replaced. Orphaned files can remain. **Unverified.**

---

**Status:** Proof packet is complete for the implementation as written. Typecheck/lint/build are failing for non-storage reasons. Manual runtime checks and GCS/bucket configuration were **not** performed. Remaining risks above are explicitly unverified.
