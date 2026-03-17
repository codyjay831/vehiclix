# Pre-Phase-2 VIN Sample Audit — Evo Motors

**Purpose:** Evaluate vPIC response quality for candidate Phase 2 fields before adding structured schema.  
**Sample:** 30 VINs decoded via `decodevinvaluesextended/{VIN}?format=json`.  
**Source:** One-off script `scripts/vpic-sample-audit.mjs`; raw results in `scripts/vpic-audit-results.json`.  
**Repo fact:** Current decoder uses only year, make, model, trim, drivetrain (structured) and bodyType, engine, horsepower (highlights). batteryRangeEstimate remains manual.

---

## A. Sample Set Summary

| Category | Count | VINs (examples) |
|----------|--------|------------------|
| **EV (BEV)** | 5 | 5YJ3E1EBXSF969484 (Tesla M3), 5YJSA1E26MF123456 (Tesla S), 7FCTGAAA0NN000001 (Rivian R1T), 7SAYGDEE0NF123456 (Tesla Y), 5YJXCBE24NF123456 (Tesla) |
| **ICE / Gasoline** | 18 | Toyota Camry/Corolla, Ford F-150, Honda Accord/Odyssey, Chevrolet Malibu/Corvette, Jeep Grand Cherokee, VW Jetta, BMW X5, Mazda3, Nissan Altima |
| **Sparse / older** | 7 | 4T1B21HK0LU014553, 1HGBH41JXMN109186, 1G1YY22G965123456, WA1BNAF54MA123456, 4T1BF1FK5MU123456, 2HGFC2F59NH123456, 4T3ZF13C2PU123456, 1FADP3K21NL123456, 3FA6P0HD2MR123456, WVWZZZ3CZWE123456 (many empty fields) |
| **Makes** | 12 | Tesla, Toyota, Ford, Honda, Chevrolet, Rivian, Nissan, Jeep, VW, BMW, Audi, Mazda |
| **Body types** | Sedan, SUV, Pickup, Coupe, Minivan, Hatchback |
| **Model years** | 1991–2025 |

All 30 VINs returned `Count: 1` and a single `Results[0]`; no API errors. Some VINs (notably older or certain manufacturer patterns) have many empty fields in vPIC.

---

## B. Field Quality Matrix

Fill rate = (non-empty string in sample) / 30. Observations from raw `Results[0]` only.

| Field | Fill rate | Value cleanliness | User-facing? | Normalization difficulty | Recommendation |
|-------|-----------|-------------------|--------------|--------------------------|----------------|
| **BodyClass** | 20/30 (67%) | Mixed: "Sedan/Saloon", "Pickup", "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)", "Minivan", "Coupe", "Hatchback/Liftback/Notchback". Some long strings. | Yes; may want to shorten for display | Medium: could map long → short or keep as-is (string) | **(a) Structured** — already used in highlights; high fill; useful for filters/specs |
| **DriveType** | 15/30 (50%) | ICE: "4x2", "4WD/4-Wheel Drive/4x4", "AWD/All-Wheel Drive", "FWD/Front-Wheel Drive". EV: often empty (Tesla 0/4, Rivian filled). | Yes | Medium: "4x2" = RWD not yet mapped; EV gap | **(a) Keep current** — already structured; consider mapping "4x2" → RWD in vin.ts |
| **Trim** | 15/30 (50%) | Short ("LE", "S") to long ("Laredo, Laredo E, Laredo X, Laredo X SE, Altitude"). Tesla often empty. | Yes | Low (free text) | **(a) Structured** — already used; accept variable length |
| **FuelTypePrimary** | 21/30 (70%) | Only "Gasoline" and "Electric" in sample. Very clean. | Yes | Low — trivial enum | **(a) Structured** — high value for EV/ICE and filters |
| **TransmissionStyle** | 14/30 (47%) | "Automatic", "Continuously Variable Transmission (CVT)". Empty for many. | Yes | Low — map CVT → "CVT", keep "Automatic" | **(a) Structured** — optional; useful when present |
| **Doors** | 21/30 (70%) | "2", "4", "5". Clean. | Yes | Low | **(a) Structured** — optional; simple integer |
| **EVDriveUnit** | 2/30 (7%) | "Dual Motor", "Quad-Motor" (Rivian); Tesla often empty. | Yes for EV | Low but sparse | **(b) Highlight only** or **(c) Ignore** — too sparse for structured |
| **BatteryKWh** | 2/30 (7%) | "82.00", "128.90". Only 2 EVs in sample had it. | Yes | Low | **(c) Ignore for range** — plan keeps batteryRangeEstimate manual; do not auto-fill from this |
| **ElectrificationLevel** | 5/30 (17%) | "BEV (Battery Electric Vehicle)" only in sample. | Yes | Low — map to BEV/PHEV/etc. if needed | **(b) Highlight only** or optional structured "fuel/electrification" later |
| **OtherEngineInfo** | 10/30 (33%) | Very mixed: "Dual Motor – Standard", "PORT+DIRECT", "Engine Brake (hp): High Output", long emissions text. | Sometimes; often technical | High | **(b) Highlight only** — keep current approach; do not use as structured |
| **EngineConfiguration** | 10/30 (33%) | "In-Line", "V-Shaped". Clean when present. | Partial | Low | Already highlight-only; keep |
| **EngineModel** | 10/30 (33%) | Mix of codes ("A25A-FKS", "2.7L-4V") and descriptive. | Partial | Medium | Already highlight-only; keep |
| **EngineHP** | 12/30 (40%) | "203.00", "202", "132". Clean numeric strings. | Yes | Low | Already highlight-only; keep |

---

## C. Recommended Phase 2 Candidates (Structured Fields)

| Field | Rationale | Risk / note |
|-------|------------|--------------|
| **bodyStyle** (from BodyClass) | 67% fill; already in highlights; good for filters and VehicleSpecs. | Long values; allow full string or add optional short-label mapping. |
| **fuelType** (from FuelTypePrimary) | 70% fill; only "Gasoline"/"Electric" in sample; high value for EV/ICE. | Add as optional string or enum (Gasoline, Electric, Diesel, etc.). |
| **transmission** (from TransmissionStyle) | 47% fill; "Automatic"/"CVT" clean; useful for listing. | Optional; normalize "Continuously Variable Transmission (CVT)" → "CVT". |
| **doors** (from Doors) | 70% fill; "2"/"4"/"5"; simple. | Optional integer; parse and validate 2–5. |
| **trim** | Already structured; no change. | Improve Trim fill by accepting Trim2 when Trim empty if product wants (sample had Trim2 always empty). |

Do not add range/battery from vPIC to structured fields; keep batteryRangeEstimate manual per plan.

---

## D. Fields to Keep Highlight-Only

| Field | Reason |
|-------|--------|
| **bodyType** (BodyClass) | If we add bodyStyle as structured, we can still push "Body: …" to highlights for backward compatibility or drop once UI shows bodyStyle in specs. |
| **engine** (EngineConfiguration / EngineModel) | Already highlight-only; 33% fill; mixed cleanliness; keep as-is. |
| **horsepower** (EngineHP) | Already highlight-only; keep. |
| **OtherEngineInfo** | Too variable and technical; highlight-only when we want to show "Dual Motor" etc. |
| **EVDriveUnit** | 7% fill; Tesla inconsistent; use as highlight text only if we surface it. |
| **ElectrificationLevel** | 17% fill; good for EV highlight ("BEV"); optional structured later. |

---

## E. Fields to Ignore (for Now)

| Field | Reason |
|-------|--------|
| **BatteryKWh** | 7% fill; plan says do not auto-fill batteryRangeEstimate from vPIC; ignore for Phase 2. |
| **Trim2** | Empty in entire sample; ignore. |
| **FuelTypeSecondary** | Empty in sample; ignore until needed. |
| **TransmissionSpeeds** | Inconsistent (e.g. "1", "8", ""); lower priority than TransmissionStyle. |
| **NCSABodyType** | Redundant with BodyClass where both present; longer text; use BodyClass only. |

---

## F. Risks / Inconsistencies Found

1. **Tesla / EV DriveType empty**  
   DriveType is empty for 4/4 Teslas and filled for Rivian R1T ("AWD/All-Wheel Drive"). Phase 1 normalizer cannot infer drivetrain for Tesla from current vPIC; consider EVDriveUnit or OtherEngineInfo for EV-only hint in a later phase (not Phase 2 scope).

2. **Tesla Trim empty**  
   Trim empty for all Tesla VINs in sample; Trim2 also empty. Structured trim will often be blank for Tesla unless we source elsewhere.

3. **Older / sparse VINs**  
   Several VINs (e.g. 1991 Honda, 1993 Toyota, some Ford/Audi) have Make but empty Model, Trim, BodyClass, DriveType, etc. Decode is still "successful" but many fields missing. UI must treat empty-after-decode as normal.

4. **Trim value length**  
   Some Trim values are long (e.g. Jeep "Laredo, Laredo E, Laredo X, Laredo X SE, Altitude"). DB/UI should allow long optional string; no truncation without product decision.

5. **BodyClass string length**  
   "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)" is long. Accept as-is for structured bodyStyle or define short display labels.

6. **TransmissionStyle empty for many**  
   47% fill; Ford F-150 (1FTFW1RG2NFB87728) and others have empty TransmissionStyle. Optional field only.

7. **Doors empty for some**  
   Pickups and a few others have empty Doors; 70% fill. Optional field only.

---

## G. Tesla / EV-Specific Patterns

| Pattern | Observation |
|--------|-------------|
| **DriveType** | Empty for all 4 Tesla VINs; filled for Rivian R1T. |
| **Trim** | Empty for all Tesla; Rivian R1T has "Adventure". |
| **BodyClass** | Present for Tesla Model 3, S, Y and Rivian (Sedan, Hatchback, SUV, Pickup). |
| **EngineConfiguration / EngineModel / EngineHP** | Empty for all Teslas and Rivian; ICE fields not used for BEV. |
| **EVDriveUnit** | Present for 2 (Tesla M3, Tesla Y); empty for Tesla S and Rivian in sample. |
| **BatteryKWh** | Present for Tesla M3 (82.00) and Rivian R1T (128.90); empty for Tesla S, Y, and one Tesla. |
| **ElectrificationLevel** | "BEV (Battery Electric Vehicle)" for all 5 EVs. |
| **FuelTypePrimary** | "Electric" for all 5 EVs. |
| **TransmissionStyle** | "Automatic"; TransmissionSpeeds "1" for EVs. |

Conclusion: For EVs, BodyClass, FuelTypePrimary, and ElectrificationLevel are reliable; DriveType and Trim are often empty; BatteryKWh and EVDriveUnit are inconsistent. Phase 2 structured bodyStyle, fuelType, and transmission still add value; drivetrain for EV may need a separate rule (e.g. EVDriveUnit → AWD when DriveType empty) in a later phase.

---

## H. Final Go/No-Go Recommendation for Phase 2

**Go for Phase 2**, with conditions:

1. **Add optional structured fields (after product approval):**  
   **bodyStyle** (from BodyClass), **fuelType** (from FuelTypePrimary), **transmission** (from TransmissionStyle, normalized), **doors** (from Doors, integer). All nullable; no backfill required.

2. **Do not add:**  
   Range/battery from vPIC; keep batteryRangeEstimate manual. Do not add EVDriveUnit or BatteryKWh as structured fields given sparse fill and plan.

3. **Normalization:**  
   All mapping and normalization in `src/lib/vin.ts` only. E.g.: TransmissionStyle "Continuously Variable Transmission (CVT)" → "CVT"; FuelTypePrimary as-is or enum; BodyClass as-is (or optional short label); Doors parse to integer 2–5.

4. **Pre-Phase-2 checkpoint:**  
   This audit satisfies the recommended "audit a real sample" checkpoint. Fill rates and cleanliness support bodyStyle, fuelType, transmission, and doors as optional structured fields. Tesla/EV gaps (DriveType, Trim) are documented; no Phase 2 change to drivetrain logic required unless we add an explicit EVDriveUnit→drivetrain rule later.

5. **Risks to accept:**  
   Trim and DriveType will often remain empty for Tesla; some older or sparse VINs will have many nulls; long Trim/BodyClass values allowed. Data-quality invariants (no overwrite meaningful with weaker; no empty over populated) must apply when applying decode to form/DB.

**Verdict:** Proceed to Phase 2 design/implementation for bodyStyle, fuelType, transmission, and doors only; keep all other fields as highlight-only or ignored per this audit.
