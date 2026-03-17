# Phase 2 VIN Decoder Expansion — Design & Patch Plan

**Mode:** Design + patch plan only. No implementation yet.  
**Scope:** Add four structured fields: bodyStyle, fuelType, transmission, doors.  
**Constraints:** batteryRangeEstimate stays manual; all normalization in `src/lib/vin.ts`; data-quality invariants; no scope creep beyond these four fields in minimum safe Phase 2.

**Locked refinements (see docs/VIN_PHASE2_DESIGN_REFINEMENT.md):**
- **Fill policy:** Fill-only-empty applies to **all** decoded fields (year, make, model, trim, drivetrain, bodyStyle, fuelType, transmission, doors), not only the four new ones.
- **Body field:** One canonical field **bodyStyle** in VinMetadata (from BodyClass); **bodyType** removed. Do not add "Body: …" to highlights in the decode path (structured bodyStyle replaces it).

---

## A. Recommended Schema Design

### New Vehicle fields (all optional / nullable)

| Field | Type | Nullable | Justification |
|-------|------|----------|----------------|
| **bodyStyle** | `String?` | Yes | Audit: 67% fill; values are free text of variable length ("Sedan/Saloon", "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)"); enum would be large and brittle; string allows future display shortening in UI without schema change. |
| **fuelType** | `String?` | Yes | Audit: 70% fill; sample had only "Gasoline" and "Electric"; string preferred over enum so we can accept "Diesel", "Plug-in Hybrid", etc. from vPIC without migration; optional label map in `src/types/enums.ts` for display only. |
| **transmission** | `String?` | Yes | Audit: 47% fill; "Automatic", "Continuously Variable Transmission (CVT)"; string with normalization in vin.ts (e.g. CVT long form → "CVT"); enum not required for two main values. |
| **doors** | `Int?` | Yes | Audit: 70% fill; values "2", "4", "5"; integer allows filtering and validation (e.g. 2–5); null when vPIC empty or invalid. |

**Why not enums for bodyStyle / fuelType / transmission**

- **bodyStyle:** vPIC BodyClass values are long and varied; new values appear by make/model. Enum would require migrations for each new value; string + optional display mapping is safer.
- **fuelType:** Sample had only Gasoline/Electric; vPIC can return "Diesel", "Plug-in Hybrid", "Flex Fuel", etc. String avoids enum churn.
- **transmission:** Same pattern; "Manual", "Dual Clutch", etc. may appear. String with normalized output from vin.ts is sufficient.

**Migration**

- Single migration adding four optional columns. Existing rows get `null`; no backfill. All consumers must treat as optional (no required validation, no default).

---

## B. Recommended UI/UX Behavior

### VehicleForm (admin add/edit)

- **Placement:** Add all four in **Section 2: Specifications** (same card as Mileage, Drivetrain, Battery Range, Exterior/Interior Color). Order suggestion: Mileage, Drivetrain, **Body style**, **Fuel type**, **Transmission**, **Doors**, Battery Range, Exterior Color, Interior Color.
- **Widgets:** bodyStyle, fuelType, transmission: optional text inputs (or Select with "Other" if we add label maps). doors: optional number input, min 2, max 5 (or Select 2/3/4/5).
- **Editable after decode:** Yes. All four remain user-editable; decode only suggests values.
- **Decode behavior (data-quality invariants):** Apply **fill-only-empty for all decoded fields** (year, make, model, trim, drivetrain, bodyStyle, fuelType, transmission, doors): set from VinMetadata only when the current form value is empty. Do not overwrite a non-empty value. (Locked: see VIN_PHASE2_DESIGN_REFINEMENT.md.)
- **Highlights:** Do **not** add "Body: …" to highlights in the decode path; structured bodyStyle in VehicleSpecs is the single place for body when present. VinMetadata exposes **bodyStyle** only (no bodyType).

### VehicleSpecs (public VDP)

- **bodyStyle:** Add a spec row when `vehicle.bodyStyle` is non-null: label "Body style", value `vehicle.bodyStyle`. Omit row when null.
- **fuelType:** Add when non-null: label "Fuel type", value display (use optional FUEL_TYPE_LABELS if we add one, else raw string). Omit when null.
- **transmission:** Add when non-null: label "Transmission", value `vehicle.transmission`. Omit when null.
- **doors:** Add when non-null: label "Doors", value `vehicle.doors` (e.g. "4"). Omit when null.

### Admin inventory table / cards / filters

- **AdminInventoryTable:** No new columns in minimum Phase 2; table already shows Year/Make/Model, VIN, Price, Mileage, Status. Optional later: add Body style or Fuel type column/filter.
- **InventoryCard (public):** No change in minimum Phase 2; card shows year/make/model, trim, drivetrain, mileage, range, price. Optional later: small fuel-type badge (e.g. "Electric").
- **InventoryFilters (public):** Currently Make, Max Price, search. Optional later: filter by bodyStyle, fuelType; defer to "Deferred items".

### Display when null

- Form: optional fields show empty; placeholder text e.g. "Optional", "From VIN".
- VehicleSpecs: omit the spec row when value is null (same as battery range "N/A" pattern; we use "omit" for consistency with optional fields).

---

## C. Normalization Plan (src/lib/vin.ts only)

### VinMetadata extension

Add to `VinMetadata`:

- `bodyStyle?: string` — single canonical body field from BodyClass (normalized). **Remove bodyType** from VinMetadata; do not add "Body: …" to highlights in decode path (locked refinement).
- `fuelType?: string`
- `transmission?: string`
- `doors?: number`

### BodyClass → bodyStyle

- **Source:** `result.BodyClass`.
- **Normalize:** Use existing `normalizeString()` (empty, "Unknown", "N/A" → undefined). No truncation; allow long strings (e.g. "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)").
- **Unexpected values:** Accept any non-weak string; store as-is. Optional future: map known long strings to shorter display labels in UI only, not in vin.ts.
- **Invalid:** Empty or weak → undefined; do not write to VinMetadata.bodyStyle.

### FuelTypePrimary → fuelType

- **Source:** `result.FuelTypePrimary`.
- **Normalize:** `normalizeString()` first. Optionally normalize casing for display (e.g. "Gasoline" → "Gasoline", "Electric" → "Electric"); accept "Diesel", "Plug-in Hybrid", "Flex Fuel", etc. as-is.
- **Unexpected values:** Any non-weak string returned; no enum constraint in decoder.
- **Invalid:** Empty or weak → undefined.

### TransmissionStyle → transmission

- **Source:** `result.TransmissionStyle`.
- **Normalize:** `normalizeString()`. Then: if lowercased includes "continuously variable" or "cvt" → return `"CVT"`; else if lowercased includes "automatic" or "manual" or "dual clutch" etc. → return trimmed string or short form (e.g. "Automatic", "Manual"). Prefer returning user-facing short string: "Automatic", "Manual", "CVT" when recognizable; otherwise return trimmed raw value (max length e.g. 80 to avoid noise).
- **Long values:** Truncate to 80 chars only if needed for DB limit; otherwise keep.
- **Invalid:** Empty or weak → undefined.

### Doors → doors

- **Source:** `result.Doors`.
- **Normalize:** Parse to integer (e.g. `parseInt(String(result.Doors), 10)`). If NaN or not in 2–5, return undefined. Otherwise return number.
- **Invalid:** Non-numeric, or < 2 or > 5 → undefined.

### Summary table

| vPIC field | VinMetadata field | Normalization |
|------------|-------------------|---------------|
| BodyClass | bodyStyle only (no bodyType) | normalizeString; no truncation |
| FuelTypePrimary | fuelType | normalizeString; optional title-case |
| TransmissionStyle | transmission | normalizeString; "CVT" for CVT; else trimmed (cap 80) |
| Doors | doors | parseInt; 2–5 only else undefined |

All in `src/lib/vin.ts` only; VehicleForm only applies VinMetadata to form state (and implements fill-only-empty for these four).

---

## D. Files Likely Affected

| File | Change |
|------|--------|
| **prisma/schema.prisma** | Add `bodyStyle String?`, `fuelType String?`, `transmission String?`, `doors Int?` to Vehicle. |
| **src/lib/vin.ts** | Extend VinMetadata (bodyStyle, fuelType, transmission, doors); remove bodyType; read BodyClass, FuelTypePrimary, TransmissionStyle, Doors; normalize; return bodyStyle (not bodyType) in decode result. |
| **src/components/admin/VehicleForm.tsx** | Add form fields bodyStyle, fuelType, transmission, doors (schema, defaultValues, FormField UI, handleDecodeVin fill-only-empty for these four). When building FormData, include new keys. Do not add any vPIC-specific logic. |
| **src/actions/inventory.ts** | createVehicleAction and updateVehicleAction: read formData.get("bodyStyle"), get("fuelType"), get("transmission"), get("doors"); parse doors to int or null; include in tx.vehicle.create/update data. Validation: no required check; allow null. |
| **src/components/public/VehicleSpecs.tsx** | Add conditional spec rows for bodyStyle, fuelType, transmission, doors when non-null. |
| **src/types/enums.ts** | Optional: add FUEL_TYPE_LABELS or display maps for fuelType/transmission for consistent labels (e.g. "Electric" → "Electric"). Not required for minimum Phase 2. |
| **src/types/index.ts** | No change; SerializedVehicle is Prisma.VehicleGetPayload-derived, so new fields flow through. |
| **src/lib/inventory.ts** | No explicit select; findMany/findFirst return full Vehicle, so new fields included. No change unless we add filters later. |

**Not changed in minimum Phase 2**

- AdminInventoryTable (no new columns).
- InventoryCard (no new props).
- InventoryFilters (no body/fuel filters).
- Lead/Deal/Inquiry vehicle shapes (they use vehicle relation; new fields present on Vehicle).

---

## E. Risks / Drift Checks

1. **Schema drift:** New columns nullable; every reader (form, actions, VehicleSpecs, any future filter) must treat as optional. SerializedVehicle and Prisma types will include the new fields; TypeScript will require handling null in components that display them.
2. **Enum mismatch:** We are not adding enums for these four; string/int optional avoids enum mismatch. If we later add enums for display, normalization in vin.ts must map to enum values or we keep display mapping only in UI.
3. **Fill-only-empty:** Form must only set all decoded fields (year, make, model, trim, drivetrain, bodyStyle, fuelType, transmission, doors) from decode when current value is empty. Implement once in handleDecodeVin for all nine.
4. **Duplicate highlight:** Do not add "Body: …" to highlights in decode path (bodyStyle is structured only; no bodyType).
5. **Long bodyStyle/transmission:** DB String has no length in schema by default (Prisma default 191 or db default); if we need a cap, add `@db.VarChar(200)` or similar for bodyStyle/transmission to avoid overflow. Doors is Int; no issue.
6. **Existing records:** All existing vehicles will have null for the four fields; no backfill. UI must omit or show "—" for null.
7. **Validation:** Form schema (zod) should allow optional/nullable for all four; actions should not throw when formData.get returns empty string—coerce to null for optional fields.

---

## F. Minimum Safe Phase 2 Scope

1. **Schema:** Add Vehicle.bodyStyle (String?), Vehicle.fuelType (String?), Vehicle.transmission (String?), Vehicle.doors (Int?). Run migration.
2. **vin.ts:** Extend VinMetadata with bodyStyle, fuelType, transmission, doors; **remove bodyType**; read BodyClass, FuelTypePrimary, TransmissionStyle, Doors; normalize; return bodyStyle (single canonical body field), fuelType, transmission, doors.
3. **VehicleForm:** Add optional form fields; defaultValues/initialData map (bodyStyle, fuelType, transmission, doors; initialData.doors); in handleDecodeVin, **fill-only-empty for all nine decoded fields** (year, make, model, trim, drivetrain, bodyStyle, fuelType, transmission, doors); include new four in FormData on submit. Remove existing "Body: …" highlight logic from decode path.
4. **Actions:** createVehicleAction and updateVehicleAction read the four new fields from FormData; coerce empty string to null; parse doors to int or null; include in create/update payload.
5. **VehicleSpecs:** Add up to four conditional rows (bodyStyle, fuelType, transmission, doors); show only when non-null.
6. **Highlights:** Do not add "Body: …" to highlights in decode path (structured bodyStyle replaces it).

No new columns in admin table, no new filters, no label enums required. All normalization in vin.ts; form remains source-agnostic.

---

## G. Deferred Items (do not implement in minimum Phase 2)

- **Admin table columns:** Add Body style or Fuel type column to AdminInventoryTable.
- **Public filters:** Filter by bodyStyle or fuelType in InventoryFilters.
- **InventoryCard badge:** Show fuel type (e.g. "Electric") on card.
- **Label enums:** FUEL_TYPE_LABELS, TRANSMISSION_LABELS, BODY_STYLE_LABELS in src/types/enums.ts for display only.
- **Body style short labels:** Map long BodyClass strings to short display names (e.g. "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)" → "SUV") in UI or vin.ts.
- **Trim2 fallback:** Use Trim2 when Trim is empty (audit had Trim2 empty; defer until needed).
- **EVDriveUnit / ElectrificationLevel:** Any structured field or drivetrain inference for EV when DriveType empty.
- **batteryRangeEstimate from vPIC:** Remain manual; no use of BatteryKWh or other vPIC range fields.

---

## H. Phased Implementation Order (within Phase 2)

| Step | Task | Purpose |
|------|------|---------|
| 1 | Schema: add bodyStyle, fuelType, transmission, doors to Vehicle; migrate | Establish data model; backward compatible (nullable). |
| 2 | Types/defaults: ensure form schema and VehicleFormValues include optional bodyStyle, fuelType, transmission, doors; defaultValues/initialData map new fields | Form can read/write new fields. |
| 3 | vin.ts: extend VinMetadata; implement normalization for BodyClass, FuelTypePrimary, TransmissionStyle, Doors; return in decodeVin result | Single source of normalized decode output. |
| 4 | VehicleForm: add FormField UI for the four; in handleDecodeVin apply fill-only-empty for all nine decoded fields; include new four in FormData on submit; remove "Body: …" highlight from decode path | User can edit; decode fills empty only; one body field (bodyStyle). |
| 5 | Actions: read four from FormData; coerce and parse; add to create/update data | Persist to DB. |
| 6 | VehicleSpecs: add conditional rows for bodyStyle, fuelType, transmission, doors | Public VDP shows new specs when present. |
| 7 | — | (Locked: no "Body: …" highlight in decode path; bodyStyle only.) |

Steps 1–6 are minimum safe Phase 2.

---

## I. Final Recommendation

- **Implement** the minimum safe Phase 2 as in section F and order in section H: schema → types/form defaults → vin.ts normalization (bodyStyle only, no bodyType) → VehicleForm (four new fields + fill-only-empty for all nine decoded fields + remove "Body: …" in decode path + FormData) → actions → VehicleSpecs.
- **Do not** add battery/range from vPIC, admin table columns, public filters, or label enums in this phase.
- **Keep** all normalization in `src/lib/vin.ts`; VehicleForm only applies VinMetadata; enforce fill-only-empty for all decoded fields to satisfy data-quality invariants (see VIN_PHASE2_DESIGN_REFINEMENT.md).
- **Treat** null/empty decoded values as normal; UI omits or shows optional placeholders for null.

This design is repo-specific, respects the pre-Phase-2 audit and locked constraints, and keeps the change set minimal and reversible.
