# VIN Decoder Improvement Plan — Evo Motors

**Mode:** Plan + patch proposal only. No implementation yet.  
**Basis:** Verified current setup (single path: VehicleForm → decodeVin in src/lib/vin.ts → NHTSA vPIC decodevinvaluesextended).

---

## A. Current-State Summary

### Decoder path (repo-verified)
- **Trigger:** VehicleForm.tsx (client) — "Decode VIN" button; requires exactly 17-character VIN.
- **Decoder:** `decodeVin(vin)` in `src/lib/vin.ts`; single GET to `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/${vin}?format=json`.
- **Response use:** `data.Results?.[0]`; if missing, returns `null`.
- **Mapping:** Result → `VinMetadata` (year, make, model, trim, bodyType, drivetrain, engine, range, horsepower). `range` is always set to `undefined` in code.

### Persisted decoded fields
- **year** → form "year" → FormData "year" → `parseInt` → `Vehicle.year` (Int).
- **make** → form "make" → FormData "make" → `Vehicle.make` (String).
- **model** → form "model" → FormData "model" → `Vehicle.model` (String).
- **trim** → form "trim" → FormData "trim" → empty → null → `Vehicle.trim` (String?).
- **drivetrain** → form "drivetrain" → FormData "drivetrain" → `Vehicle.drivetrain` (Drivetrain enum: AWD | RWD | FWD).

### Highlight-only (decoder → highlights array, then persisted as Vehicle.highlights)
- **bodyType** → "Body: {bodyType}" pushed to highlights.
- **engine** → "Engine: {engine}" pushed to highlights.
- **horsepower** → "{horsepower} HP" pushed to highlights.

### Current limitation
- **range:** Always `undefined` in `VinMetadata` (line 51: ternary yields undefined in both branches). Form has `batteryRange` / DB has `batteryRangeEstimate`; decoder never sets either.

### Vehicle model (prisma/schema.prisma)
- **Relevant fields:** vin, year, make, model, trim (String?), mileage, drivetrain (enum), batteryRangeEstimate (Int?), exteriorColor, interiorColor, condition (InventoryCondition), titleStatus (TitleStatus), price, description, highlights (String[]), features (String[]), internalNotes, vehicleStatus.
- **No DB field today for:** body style, engine, horsepower, fuel type, transmission, doors, electrification type, manufacturer/plant/series.

### Enums (schema + src/types/enums.ts)
- **Drivetrain:** AWD, RWD, FWD (Prisma + DRIVETRAIN_LABELS).
- **InventoryCondition:** EXCELLENT, GOOD, FAIR.
- **TitleStatus:** CLEAN, SALVAGE, REBUILT, LEMON.
- **VehicleStatus:** DRAFT, LISTED, RESERVED, UNDER_CONTRACT, SOLD, ARCHIVED.
- No FuelType, Transmission, BodyStyle, or DoorCount enums in repo.

### UI that consumes vehicle data
- **VehicleForm.tsx:** All form fields; decode only fills year, make, model, trim, drivetrain + highlights.
- **AdminInventoryTable.tsx:** year, make, model, vin, price, mileage, vehicleStatus, media.
- **admin/inventory/[id]/page.tsx:** year, make, model, vin, vehicleStatus (detail header).
- **admin/inventory/[id]/edit/page.tsx:** Wraps VehicleForm with initialData.
- **VehicleSpecs.tsx (public):** year, mileage, drivetrain, batteryRangeEstimate, exteriorColor, interiorColor, condition, titleStatus, vin.
- **InventoryCard.tsx:** year, make, model, trim, drivetrain, mileage, batteryRangeEstimate, price, media.
- **VdpContent.tsx:** description, highlights, features.
- **Marketing VDP page:** vehicleName uses year, make, model, trim; VehicleSpecs + VdpContent render specs/highlights/features.

### Create/update actions (src/actions/inventory.ts)
- **createVehicleAction:** Reads FormData keys vin, year, make, model, trim, mileage, drivetrain, batteryRange, exteriorColor, interiorColor, condition, titleStatus, price, description, highlights, features, internalNotes; writes same into `tx.vehicle.create` (batteryRange → batteryRangeEstimate).
- **updateVehicleAction:** Same key set; writes into `tx.vehicle.update`. No VIN decode in either action.

---

## B. Decoder Expansion Opportunity Matrix

| Field | DB has place? | Form has field? | Manually entered today? | Obvious vPIC mapping? | Recommendation |
|-------|----------------|-----------------|--------------------------|------------------------|-----------------|
| **Body style** | No (only in highlights as text) | No | No (decoder → highlights) | Yes: BodyClass (already used) | **(b) Highlights only** unless we add a structured field later. |
| **Engine** | No | No | No (decoder → highlights) | Yes: EngineConfiguration / EngineModel (already used) | **(b) Highlights only** for now. |
| **Horsepower** | No | No | No (decoder → highlights) | Yes: EngineHP (already used) | **(b) Highlights only** or future structured field. |
| **Fuel type** | No | No | Yes (N/A in form) | vPIC often has FuelType - Primary / Secondary | **(c) Not used yet** until we add FuelType enum/field; then **(a)** or **(b)**. |
| **Transmission** | No | No | No | vPIC often has TransmissionStyle, TransmissionSpeeds | **(c) Not used yet**; add structured field + enum later if desired. |
| **Doors** | No | No | No | vPIC can have DoorCount | **(c) Not used yet**; low priority unless we add DoorCount. |
| **Battery range** | Yes: batteryRangeEstimate | Yes: batteryRange | Yes (manual) | vPIC: ElectrificationLevel; range often not in decodevinvaluesextended (needs other endpoint or manual) | **(a) Persist** when we have a reliable source; today **(e) Fallback/manual** — do not guess. |
| **Electrification / EV / PHEV / hybrid** | No | No | No | ElectrificationLevel, FuelType - Primary | **(c) Not used yet** or **(b)** as highlight text until we add a type enum. |
| **Drive type normalization** | Yes (drivetrain enum) | Yes | Partially (decode helps) | DriveType string → AWD/RWD/FWD (already done) | **(d) Normalization** — improve mapping (e.g. "4X4" → AWD) and document unmapped values. |
| **Manufacturer / plant / series** | No | No | No | vPIC has Manufacturer, PlantCompanyName, etc. | **(c) Ignore for now** unless we need for reporting. |
| **Trim2 / series / style** | No (we have single trim) | No (single trim) | No | vPIC can have multiple trim/style fields | **(c) Ignore for now**; single trim is enough for MVP. |
| **Other high-value for dealership** | — | — | — | Discretionary | See Section G (external suggestion only). |

**Legend**
- **(a)** Persisted as structured field (schema + form + action).
- **(b)** Append to highlights only (no schema change).
- **(c)** Not used yet / ignore for now.
- **(d)** Needs normalization logic in decoder.
- **(e)** Needs fallback / manual entry (decoder may not supply).

---

## C. Recommended Target Design

### Recommended structured fields to add (Phase 2)
- **None in Phase 1.** Phase 1 is zero schema change.
- **Phase 2 candidates (if product wants them):**
  - **transmission** (String? or enum): vPIC TransmissionStyle; form field + Vehicle.transmission optional.
  - **fuelType** (String? or enum): vPIC Fuel Type - Primary; form field + Vehicle.fuelType optional.
  - **bodyStyle** (String?): vPIC BodyClass; already decoded, move from highlights-only to optional structured field so it can be displayed in specs and filtered later.
  - **batteryRangeEstimate:** Do not auto-fill from decoder until we have a verified source (e.g. vPIC endpoint that returns range or explicit policy). Keep manual only until then.

### Recommended to keep as highlights only
- **bodyType** (BodyClass): Keep pushing "Body: {bodyType}" to highlights until/unless we add Vehicle.bodyStyle.
- **engine** (EngineConfiguration / EngineModel): Keep "Engine: {engine}" in highlights.
- **horsepower** (EngineHP): Keep "{horsepower} HP" in highlights.
- **Electrification / EV type:** If we ever read it, append as highlight text only unless we add an enum.

### Fields to ignore for now
- Manufacturer, PlantCompanyName, series, trim2/style (vPIC), door count (unless we add DoorCount later).

### Fields that need normalization logic
- **Drivetrain:** Current logic maps DriveType string to AWD/RWD/FWD; extend for edge cases (e.g. "Part-time 4-Wheel Drive" → AWD, "4WD" variants). Document unmapped values and consider "unknown" or leave unset.
- **Trim:** vPIC Trim can be long or empty; keep current optional string; no enum.
- **Fuel type / transmission:** If we add them, define allowed values or enum and normalize vPIC strings (e.g. "Electric" vs "Battery Electric") to avoid schema/enum mismatch.

### Fields that need fallback / manual entry
- **Battery range:** Decoder must not set batteryRangeEstimate from current vPIC response (range not reliably in decodevinvaluesextended). Keep manual only; optional: future server-side call to a different endpoint or third-party EV API with clear provenance.
- **Exterior/interior color:** vPIC does not reliably provide; keep manual.
- **Condition, title status, price, mileage:** Not from VIN; remain manual.

---

## D. Data Quality Invariants (mandatory)

The following invariants apply to all VIN decode behavior (current and future):

1. **VIN decode must never reduce data quality.**  
   Decode may add or fill empty fields; it must not replace better existing data with worse decoded data.

2. **Never overwrite a meaningful existing value with a weaker decoded value.**  
   "Meaningful" = non-empty, non-placeholder, user-entered or previously decoded and confirmed. "Weaker" = empty, generic, "Unknown", or less specific. If the existing value is already strong, decode must not replace it.

3. **Never write empty/unknown values over populated fields.**  
   Do not set a form field or persisted field to null, empty string, or "Unknown" when the current value is already populated. Decode fills blanks; it does not clear or downgrade.

4. **Never create noisy duplicate highlights.**  
   When adding decoder-sourced lines to highlights, do not add a line that is semantically equivalent to one already present (e.g. same "Body: ..." or "Engine: ..."). Current "append only if not already in list" behavior must be preserved and extended for any new highlight patterns.

These invariants override any "overwrite" behavior described elsewhere until Phase 3 fill-only-empty is implemented; once implemented, fill-only-empty is the mechanism that satisfies them.

---

## E. Architecture Constraint

- **All source-field normalization must live in `src/lib/vin.ts`.**  
  Mapping from vPIC (or any future source) field names and raw values into our app’s shape (VinMetadata, enums, display-ready strings) is done only in the decoder layer. This includes: DriveType → drivetrain enum, BodyClass → bodyStyle string, trimming, "Unknown" handling, and any highlight string formatting that is source-specific.

- **`VehicleForm.tsx` only applies normalized output to form state.**  
  It must not contain vPIC-specific mapping logic (e.g. reading `result.DriveType` or `result.BodyClass`). It receives `VinMetadata` from `decodeVin()` and sets form fields and highlights from that. If a new source is added later, only `src/lib/vin.ts` (or a normalizer it calls) should change; the form remains source-agnostic.

---

## F. Drift Risks / Invariants to Protect

1. **Schema drift risk**  
   Adding new columns (e.g. bodyStyle, transmission, fuelType) requires migration; existing rows will have null. All consumers (form, actions, VehicleSpecs, cards, VDP) must treat new fields as optional. Risk: medium if we add fields without updating every reader.

2. **Enum mismatch risk**  
   If we add Drivetrain-like enums (e.g. FuelType, TransmissionType), vPIC returns free text. Mapping must be defensive: only map known values; otherwise leave null or "Other" and do not persist raw vPIC strings that are not in the enum. Risk: high if we persist unmapped values.

3. **False-confidence decode risk**  
   Decoder can return partial or wrong data (wrong year/model for some VINs). We should not present "Decoded" as 100% accurate. Mitigation: optional "fill only empty fields" and/or a small "VIN decoded" indicator without overwriting user-edited values. Risk: medium for trust.

4. **Overwriting user-entered values risk**  
   Current behavior: decode overwrites year, make, model, trim, drivetrain and appends to highlights. If user had already corrected a field, decode overwrites it. Mitigation: in Phase 3, consider "fill only if current value is empty" or confirm before overwrite. Risk: medium for UX.

5. **EV range accuracy risk**  
   Setting batteryRangeEstimate from an unverified or wrong source (e.g. generic trim range vs actual vehicle) misleads buyers. Do not auto-fill range from current vPIC response. Risk: high if we auto-fill without verification.

6. **Inconsistent NHTSA population risk**  
   vPIC population varies by manufacturer and year. Some VINs return empty Trim, BodyClass, or DriveType. UI and reports must treat "empty after decode" as normal; do not assume "decoded = complete." Risk: medium.

7. **Old records vs new records migration**  
   New structured fields (e.g. bodyStyle, transmission) will be null for all existing vehicles. Backfill is optional and risky (would require re-decode or manual entry). Prefer: new fields optional, no backfill unless product explicitly requests it. Risk: low if we keep new fields optional.

---

## G. Proposed Architecture

- **Decode: client-side vs server-side**  
  **Recommendation:** Keep decode **client-side** for Phase 1–2 to avoid extra latency and server load; no API key is required for vPIC. Optionally move to **server-side** in Phase 3 if we need caching, rate limiting, or provenance (e.g. log decode results server-side). If we later add a paid/EV-specific API with a key, server-side is required.

- **src/lib/vin.ts: keep as-is or split?**  
  **Recommendation:**  
  - **Phase 1:** Keep single file; improve drivetrain normalization only; do not add fuel/transmission to VinMetadata or highlights until audit proves clean.  
  - **Phase 2+:** Optionally split into: **(1)** `fetchDecodeVinValuesExtended(vin)` — raw GET and return `data.Results?.[0]`; **(2)** `normalizeVinResult(result)` — map to `VinMetadata` (and handle enums); **(3)** VehicleForm only applies VinMetadata to form state (no source-specific mapping). All normalization stays in vin.ts (or a normalizer it calls).

- **Preserve current highlights behavior?**  
  **Yes.** Keep appending body type, engine, and horsepower to highlights when present and not already in the list. If we add structured bodyStyle later, we can still push a short body line to highlights for backward compatibility or stop duplicating once UI shows bodyStyle in specs.

- **Fill only empty fields or overwrite?**  
  **Current:** Overwrite. **Recommendation (Phase 3):** Prefer "fill only empty" for structured fields (year, make, model, trim, drivetrain) so that user corrections are not lost when they click Decode again. Highlights can remain "append if not present."

- **Track decode confidence / source provenance?**  
  **Recommendation:** Phase 3. Optional: add `vinDecodedAt?: Date` and/or `vinSource?: 'nhtsa'` on Vehicle so we can show "Specs from VIN (NHTSA)" and avoid re-decode on every edit. Do not store raw vPIC response in DB unless we have a clear use (e.g. support).

- **Cache VIN results?**  
  **Recommendation:** Phase 3. Optional in-memory or short-lived cache (e.g. Map<vin, VinMetadata>) in client to avoid duplicate requests when user clicks Decode twice; or server-side cache if decode moves to server. No persistence of cache required for MVP.

---

## H. Phased Implementation Plan

### Phase 1: Drivetrain normalization and safe highlight enrichment only (no schema changes)
- **Purpose:** Improve drivetrain mapping and enrich highlights only with decoder output that is already in use (body type, engine, horsepower). No new vPIC fields pushed to highlights until proven clean.
- **Scope:**  
  - **Drivetrain:** Improve normalization in `src/lib/vin.ts` (e.g. more DriveType variants → AWD/RWD/FWD; document unmapped values). All mapping stays in vin.ts.  
  - **Highlights:** Continue current behavior only: append "Body: {bodyType}", "Engine: {engine}", "{horsepower} HP" when present and not already in highlights. No new highlight patterns (e.g. no "Fuel:" or "Transmission:") in Phase 1 unless a separate audit proves vPIC returns consistently clean, user-facing values for those fields.  
  - **batteryRangeEstimate:** Remain manual only; decoder must not set it.  
- **Likely files:** `src/lib/vin.ts` (drivetrain normalization only; no new VinMetadata fields for fuel/transmission in Phase 1), `src/components/admin/VehicleForm.tsx` (no new logic; only applies existing VinMetadata to form/highlights as today).  
- **Risk level:** Low.  
- **Confidence:** High.

### Pre-Phase-2 checkpoint: Decode response audit
- **Purpose:** Before adding structured fields (bodyStyle, transmission, fuelType) or new highlight patterns for fuel/transmission, verify real vPIC response quality.
- **Actions:**  
  - Run decode for a representative sample of VINs (e.g. 20–50: multiple makes, EV/ICE, years).  
  - Capture and inspect raw `Results[0]` (or equivalent) for: BodyClass, Fuel Type - Primary, TransmissionStyle (or equivalent), and any range-related fields.  
  - Evaluate: consistency of presence, value cleanliness (no internal codes, user-facing strings), and suitability for structured fields or highlights.  
  - Document: which fields are safe to use as structured vs highlights-only vs not used.  
- **Outcome:** Go/no-go and field-level decisions for Phase 2 (see Section J).

### Phase 2: Structured field additions (after checkpoint go)
- **Purpose:** Add optional DB and form fields for body style, transmission, fuel type (or subset) only for fields that passed the audit; display in VehicleSpecs, filters, reports.
- **Likely files:** `prisma/schema.prisma` (add optional columns, e.g. Vehicle.bodyStyle String?, Vehicle.transmission String?, Vehicle.fuelType String?), `src/actions/inventory.ts` (read new FormData keys, include in create/update), `src/components/admin/VehicleForm.tsx` (add form fields; apply VinMetadata from decode only—no source-specific logic), `src/components/public/VehicleSpecs.tsx` (show new fields if present), `src/lib/vin.ts` (add normalized output for new fields; all normalization here).
- **Actions:**  
  - Migration for new columns (nullable).  
  - Form: optional inputs; decode fills when available; respect data-quality invariants (no overwrite of meaningful with weaker; no empty over populated when fill-only-empty is in effect).  
  - Normalize vPIC strings in vin.ts only; leave null if unmapped.  
- **Risk level:** Medium (schema + all consumers).  
- **Confidence:** Medium; depends on checkpoint results.

### Phase 3: Normalization / provenance / UX improvements
- **Purpose:** Safer decode behavior, better UX, optional provenance and caching.
- **Likely files:** `src/lib/vin.ts` (split: fetch vs normalize; optional server-side if moved), `src/components/admin/VehicleForm.tsx` (fill-only-empty logic, optional "Decoded from VIN" indicator), optional server action or API route for decode if we move server-side, optional cache layer.
- **Actions:**  
  - Fill-only-empty for decoded structured fields.  
  - Optional vinDecodedAt / vinSource.  
  - Optional client or server cache for decode.  
  - Document unmapped DriveType (and any new enums) and handle gracefully.  
- **Risk level:** Low–medium.  
- **Confidence:** Medium (implementation detail).

---

## I. Optional: Likely vPIC Fields (external suggestion only)

**Repo fact:** We only read today: ModelYear, Make, Model, Trim, BodyClass, DriveType, EngineConfiguration, EngineModel, EngineHP, ElectrificationLevel (and do not use range from it).

**External / not proven in repo:** Typical NHTSA vPIC DecodeVINValuesExtended responses often include (names may vary; verify against live response or NHTSA docs before relying):
- Fuel Type - Primary / Secondary  
- Transmission Style / Transmission Speeds  
- Door Count  
- Engine Displacement, Engine Cylinders  
- Vehicle Type, Body Class (we use BodyClass)  
- Manufacturer, Plant Company Name  
- Series, Trim (we use Trim), Style  

**Suggestion for dealership value:** Fuel type, transmission, body style (we already decode), and door count are commonly useful for listing and filtering. Battery range is often not in DecodeVINValuesExtended; other vPIC endpoints or EV-specific APIs may be needed for range—do not assume it exists in current response.

---

## J. Go/No-Go Criteria for Phase 2

Phase 2 (structured field additions) should proceed only after the Pre-Phase-2 checkpoint and when the following are satisfied:

**Go criteria (all required):**
- Pre-Phase-2 decode audit is complete and documented (sample VINs, fields inspected, quality assessment).
- For each candidate structured field (e.g. bodyStyle, transmission, fuelType): audit shows values are present often enough, consistently formatted, and user-facing (no internal codes or raw API strings that would confuse users).
- Product has approved which structured fields to add (bodyStyle, transmission, fuelType, or subset).
- Data-quality invariants (Section D) are implemented or explicitly scoped for Phase 2 (e.g. fill-only-empty or "never overwrite meaningful with weaker" applied to new fields).
- All normalization for new fields is implemented in `src/lib/vin.ts`; VehicleForm has no source-specific mapping.

**No-go / defer:**
- Audit shows a candidate field is often empty, inconsistent, or not user-facing → do not add as structured field; leave as highlights-only or unused until evidence improves.
- batteryRangeEstimate: no auto-fill from vPIC in Phase 2 unless a verified range source is documented and implemented; remain manual.

---

## K. Final Recommendation

1. **Phase 1:** Drivetrain normalization and safe highlight enrichment only (no schema change, no fuel/transmission in highlights until proven clean); batteryRangeEstimate stays manual. All normalization in `src/lib/vin.ts`; VehicleForm only applies normalized output. Low risk, high confidence.  
2. **Pre-Phase-2:** Audit a real sample of decoded VIN responses; document which fields are safe for structured use or highlights.  
3. **Phase 2:** Add optional structured fields only after checkpoint go and product approval; respect data-quality invariants and keep normalization in vin.ts.  
4. **Phase 3:** Fill-only-empty, optional provenance/caching, optional server-side decode.  
5. **Do not:** Auto-fill batteryRangeEstimate from current vPIC; add enums without a normalization map; overwrite meaningful values with weaker or empty (invariants in Section D).  
6. **Keep:** Single decoder path; central normalization in `src/lib/vin.ts`; VehicleForm source-agnostic; no duplicate highlights.

This plan is grounded in the verified repo state and keeps schema and behavior changes incremental and reversible.
