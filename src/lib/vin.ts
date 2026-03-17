/**
 * VIN Decoding utility using NHTSA vPIC API.
 * All source-field normalization lives here; consumers (e.g. VehicleForm) only apply normalized output.
 */

export interface VinMetadata {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
  drivetrain?: "AWD" | "RWD" | "FWD";
  engine?: string;
  range?: number;
  horsepower?: string;
  fuelType?: string;
  transmission?: string;
  doors?: number;
  /** From BatteryKWh when present and parseable; never decode chemistry/charging/range. */
  batteryCapacityKWh?: number;
}

/** Returns undefined for empty, whitespace-only, or known "weak" sentinel values so we never reduce data quality. */
function normalizeString(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  if (s === "") return undefined;
  const lower = s.toLowerCase();
  if (lower === "unknown" || lower === "n/a" || lower === "not reported" || lower === "unspecified") return undefined;
  return s;
}

/**
 * Map NHTSA DriveType to our Drivetrain enum (AWD | RWD | FWD).
 * Unmapped values (e.g. "2-Wheel Drive", "Part-time 2-Wheel") remain undefined so we never overwrite with weaker.
 */
function normalizeDriveType(driveType: string | undefined | null): "AWD" | "RWD" | "FWD" | undefined {
  const raw = (driveType ?? "").trim().toLowerCase();
  if (!raw) return undefined;

  // AWD: all-wheel, 4wd, 4x4, part-time/full-time 4-wheel
  if (
    raw.includes("awd") ||
    raw.includes("4wd") ||
    raw.includes("4x4") ||
    raw.includes("all wheel") ||
    raw.includes("four wheel") ||
    raw.includes("4 wheel") ||
    raw.includes("part-time 4") ||
    raw.includes("full-time 4") ||
    raw.includes("part time 4") ||
    raw.includes("full time 4")
  ) {
    return "AWD";
  }

  // RWD: rear-wheel
  if (
    raw.includes("rwd") ||
    raw.includes("rear wheel") ||
    raw.includes("rear-wheel")
  ) {
    return "RWD";
  }

  // FWD: front-wheel
  if (
    raw.includes("fwd") ||
    raw.includes("front wheel") ||
    raw.includes("front-wheel")
  ) {
    return "FWD";
  }

  return undefined;
}

/** Normalize TransmissionStyle to short user-facing string; cap length for DB. */
function normalizeTransmission(value: string | undefined | null): string | undefined {
  const s = normalizeString(value);
  if (!s) return undefined;
  const lower = s.toLowerCase();
  if (lower.includes("continuously variable") || lower.includes("cvt")) return "CVT";
  if (lower.includes("automatic")) return "Automatic";
  if (lower.includes("manual")) return "Manual";
  return s.length > 80 ? s.slice(0, 80) : s;
}

/** Parse Doors to integer 2-5 only; invalid or out of range returns undefined. */
function normalizeDoors(value: string | undefined | null): number | undefined {
  if (value == null || String(value).trim() === "") return undefined;
  const n = parseInt(String(value).trim(), 10);
  if (Number.isNaN(n) || n < 2 || n > 5) return undefined;
  return n;
}

/** Parse BatteryKWh to number; accept 1–300 kWh only so we never reduce data quality. */
function normalizeBatteryKWh(value: string | undefined | null): number | undefined {
  if (value == null || String(value).trim() === "") return undefined;
  const n = parseFloat(String(value).trim());
  if (Number.isNaN(n) || n < 1 || n > 300) return undefined;
  return n;
}

export async function decodeVin(vin: string): Promise<VinMetadata | null> {
  try {
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/${vin}?format=json`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch VIN data from NHTSA");
    }

    const data = await response.json();
    const result = data.Results?.[0];

    if (!result) return null;

    const drivetrain = normalizeDriveType(result.DriveType);

    const yearRaw = result.ModelYear ? parseInt(String(result.ModelYear), 10) : NaN;
    const year = Number.isNaN(yearRaw) ? undefined : yearRaw;

    return {
      year,
      make: normalizeString(result.Make),
      model: normalizeString(result.Model),
      trim: normalizeString(result.Trim),
      bodyStyle: normalizeString(result.BodyClass),
      drivetrain,
      engine: normalizeString(result.EngineConfiguration || result.EngineModel),
      range: undefined, // not reliably in decodevinvaluesextended; keep manual
      horsepower: normalizeString(result.EngineHP),
      fuelType: normalizeString(result.FuelTypePrimary),
      transmission: normalizeTransmission(result.TransmissionStyle),
      doors: normalizeDoors(result.Doors),
      batteryCapacityKWh: normalizeBatteryKWh(result.BatteryKWh),
    };
  } catch (error) {
    console.error("VIN decoding failed:", error);
    return null;
  }
}
