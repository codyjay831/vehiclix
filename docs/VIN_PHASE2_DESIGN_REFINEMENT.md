# Phase 2 Design Refinement — Fill Policy & Body Field

**Mode:** Design refinement only. No implementation.  
**Purpose:** Lock fill-only-empty scope and bodyStyle/bodyType handling before coding.

---

## A. Fill-Policy Comparison

### Repo context

- **Current behavior (VehicleForm.handleDecodeVin):** For every decoded field we have today we do: `if (data.year) form.setValue("year", data.year)` (and same for make, model, trim, drivetrain). So we **overwrite** whenever the decoded value is truthy, regardless of current form value.
- **Data-quality invariants (docs/VIN_DECODER_IMPROVEMENT_PLAN.md):** (1) Decode must never reduce data quality. (2) Never overwrite a meaningful existing value with a weaker decoded value. (3) Never write empty/unknown over populated fields. (4) No duplicate highlights. The improvement plan states that fill-only-empty is the mechanism that satisfies these invariants.
- **Phase 2 new fields:** bodyStyle, fuelType, transmission, doors. Design already called for fill-only-empty for these four.

### Impact of fill-only-empty per field

| Field | Current | Fill-only-empty impact |
|-------|---------|------------------------|
| **year** | Overwrite when decode has value | Set only when current year is empty (e.g. 0, or undefined; form default for new vehicle is from initialData or schema default). On edit, if user already set year we do not overwrite. |
| **make** | Overwrite when decode has value | Set only when current make is "" or undefined. Preserves user correction (e.g. "Acura" after decode said "Honda"). |
| **model** | Overwrite when decode has value | Same; preserves corrections. |
| **trim** | Overwrite when decode has value | Set only when trim is null/empty. Tesla often empty from vPIC; when user types trim we don’t overwrite on re-decode. |
| **drivetrain** | Overwrite when decode has value | Set only when we treat drivetrain as “empty” (e.g. no default, or we don’t overwrite when user already chose AWD). Form has required drivetrain with default—need a single rule: “empty” = not yet meaningfully set; for new vehicle that may be schema default; for edit it’s initialData. |
| **bodyStyle** | N/A (new) | As designed: set only when current bodyStyle is empty. |
| **fuelType** | N/A (new) | Same. |
| **transmission** | N/A (new) | Same. |
| **doors** | N/A (new) | Same. |

**Definition of “empty” for form (implementation detail for later):** For string fields: undefined, null, or "" (after trim). For number (year, doors): undefined, null, or 0 only if we treat 0 as “unset” (year 0 is invalid; doors 0 is invalid). For drivetrain: enum is required in schema so there is always a value; “empty” can mean “current value equals the form’s initial default for a new vehicle” or we simply don’t set drivetrain when the field was already explicitly set by user—operationally, “only set when the field is blank” for optional fields, and for required drivetrain “only set when we’re on a new vehicle and drivetrain is still the default” or “only set when decode returns a value and we’re not overwriting a user-edited value.” Simplest: treat as “empty” when the value is the same as the default for a brand-new form (e.g. first option in enum) or when the field is optional and null/empty.

### Option A: Fill-only-empty for new fields only

- **Scope:** bodyStyle, fuelType, transmission, doors use fill-only-empty. year, make, model, trim, drivetrain keep current overwrite behavior.
- **User experience:** Inconsistent. User corrects Make to “Acura” then clicks Decode again → Make overwrites back to “Honda.” Same for year/model/trim/drivetrain. For the four new fields, Decode does not overwrite. Users cannot infer a single rule.
- **Data-quality invariants:** Invariants 1–3 are still violated for year, make, model, trim, drivetrain whenever we overwrite a user-entered or previously confirmed value. Only the new four fields are protected.
- **Implementation risk:** Lower; smaller change set; only new fields need the “isEmpty” check.
- **Backward behavior:** No change for existing five fields; current overwrite behavior remains. No new user-facing doc needed for existing fields.

### Option B: Fill-only-empty for all decoded fields

- **Scope:** year, make, model, trim, drivetrain, bodyStyle, fuelType, transmission, doors all use fill-only-empty. Set from decode only when the current form value is considered empty (per definition above).
- **User experience:** One rule: “Decode fills blank fields; it never overwrites what you’ve entered.” Predictable and consistent.
- **Data-quality invariants:** Satisfied for all decoded fields. No overwrite of meaningful with weaker; no empty over populated.
- **Implementation risk:** Slightly higher: must define and implement “empty” for year (e.g. undefined or 0), make/model/trim ("" or undefined), drivetrain (e.g. default enum or “not yet set”), and the four new fields. One helper (e.g. `isFormFieldEmpty(form, fieldName)` or per-field checks) keeps logic clear.
- **Backward behavior:** **Behavior change.** Today, “Decode VIN” overwrites year/make/model/trim/drivetrain when vPIC returns values. After Phase 2 (Option B), it will not overwrite if the user (or initialData) already set them. Users who currently “re-decode to fix” a wrong value would have to clear the field first, then decode. This is the correct behavior under the invariants and should be documented (e.g. in-app: “Decode fills empty fields only”).

### Recommendation: **Option B (fill-only-empty for all decoded fields)**

- **Consistency:** One policy for every decoded field; easier to explain and to maintain.
- **Invariants:** Aligns with mandatory data-quality invariants for the whole decode path, not only the new four.
- **Implementation:** One place in handleDecodeVin applies the same rule to all nine fields; “empty” checks are straightforward (optional string: !value?.trim(); number: value == null || value === 0 for year/doors; drivetrain: compare to default or treat as “set” when initialData exists and we’re in edit mode—simplest is “only set when current value is falsy or equals default for new form”).
- **Backward change:** Acceptable. The change is “decode no longer overwrites”; we document it and optionally add a short in-form note: “Decode fills empty fields only.”

**Conclusion:** Phase 2 should implement **fill-only-empty for all decoded fields** (year, make, model, trim, drivetrain, bodyStyle, fuelType, transmission, doors), not only for the four new ones.

---

## B. Canonical Body Field Recommendation

### Current state

- **vin.ts:** Returns `bodyType` from BodyClass; used only for the highlight path in VehicleForm: “Body: {data.bodyType}” is pushed to highlights when not already present.
- **Phase 2 design:** Add structured `bodyStyle` (DB + form). Design doc suggested keeping both `bodyType` and `bodyStyle` in VinMetadata, both sourced from BodyClass, with form using bodyStyle and highlight using bodyType (and not adding “Body: …” when bodyStyle is set to avoid duplicate).

### Options

1. **Two names in VinMetadata (bodyType + bodyStyle):** Same normalized value from BodyClass; form uses bodyStyle; highlight uses bodyType. Redundant; two names for one source of truth.
2. **One canonical field (bodyStyle only):** VinMetadata has only `bodyStyle` from BodyClass. Form uses `data.bodyStyle` for the structured field and for any highlight logic: e.g. “add ‘Body: …’ to highlights only when we don’t set the bodyStyle form field and data.bodyStyle is present and not already in highlights.” That keeps one canonical value and avoids duplication.

### Recommendation: **One canonical field — bodyStyle only**

- **vin.ts:** Return a single body field from BodyClass: **bodyStyle** (normalized via existing normalizeString). Remove **bodyType** from VinMetadata. All consumers use bodyStyle.
- **VehicleForm:**  
  - Structured field: set `bodyStyle` from `data.bodyStyle` (fill-only-empty).  
  - Highlights: do **not** add “Body: {data.bodyStyle}” when we now have a structured bodyStyle field. Reason: VehicleSpecs will show bodyStyle on the VDP; adding the same to highlights would duplicate. If decode returns bodyStyle but we didn’t set the form (e.g. user already had a value), we still don’t add to highlights, because the structured bodyStyle in specs is the single place for body info when we have it. So: **Phase 2 stops adding “Body: …” to highlights from decode.** Existing vehicles that already have “Body: …” in highlights keep it; new decodes no longer add it once we have bodyStyle as a structured field.
- **Backward compatibility:** Vehicles created before Phase 2 may have “Body: …” in highlights from old decode behavior; that’s fine. New decodes (Phase 2+) use bodyStyle only and do not add a body highlight. No need to keep bodyType in VinMetadata.

**Conclusion:** Use **one canonical normalized value**, **bodyStyle**, from BodyClass in vin.ts. Remove **bodyType** from VinMetadata. Form uses bodyStyle for the structured field; do **not** add “Body: …” to highlights in the decode path in Phase 2 (structured body style replaces that highlight for new decodes).

---

## C. Final Phase 2 Recommendation

### 1. Fill policy (locked)

- **Apply fill-only-empty to all decoded fields:** year, make, model, trim, drivetrain, bodyStyle, fuelType, transmission, doors.
- **Implementation:** In handleDecodeVin, for each of these nine fields, set from decode only when the current form value is considered empty (per consistent rules: optional string → empty when null/undefined/trimmed ""; year/doors → empty when null/undefined or 0; drivetrain → e.g. empty when it’s the default for a new form or when optional; exact rule to be chosen at implementation time). Do not overwrite non-empty values.
- **Documentation:** State that “Decode fills empty fields only” (in-app or docs) and that re-decode will not overwrite user-entered or already-saved values.

### 2. Body field handling (locked)

- **VinMetadata:** Expose a single body field: **bodyStyle** (from BodyClass, normalized). **Remove bodyType** from VinMetadata.
- **Form:** Use `data.bodyStyle` for the bodyStyle form field (fill-only-empty).
- **Highlights:** In the decode path, **do not** add “Body: …” to highlights in Phase 2. Structured bodyStyle in VehicleSpecs is the single source for body when present; this avoids duplicate body info and simplifies the model.

### 3. Scope change vs minimum safe Phase 2

- **Minimum safe Phase 2 scope is expanded** to include:
  - Fill-only-empty for **all nine** decoded fields (not only the four new ones).
  - One canonical body field **bodyStyle** in VinMetadata; **no bodyType**.
  - No “Body: …” highlight added when decoding (structured bodyStyle replaces it for new decodes).

- **No reduction in scope:** We still add only the four new DB fields (bodyStyle, fuelType, transmission, doors); we still do not add admin columns, public filters, or battery/range from vPIC. The only additions to the previous “minimum safe Phase 2” are:
  - Extending fill-only-empty to year, make, model, trim, drivetrain.
  - Canonical bodyStyle only and removal of bodyType from VinMetadata.
  - Stopping the “Body: …” highlight in the decode path.

These refinements are design locks before implementation; they do not add new schema or new features beyond what was already in Phase 2, but they make the behavior consistent and the data model simpler.
