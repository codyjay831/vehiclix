/**
 * VIN Decoding utility using NHTSA vPIC API.
 */

export interface VinMetadata {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyType?: string;
  drivetrain?: "AWD" | "RWD" | "FWD";
  engine?: string;
  range?: number;
  horsepower?: string;
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

    // Map NHTSA Drive Type to our Drivetrain enum
    let drivetrain: "AWD" | "RWD" | "FWD" | undefined;
    const driveType = (result.DriveType || "").toLowerCase();
    if (driveType.includes("awd") || driveType.includes("4wd") || driveType.includes("4x4") || driveType.includes("all wheel")) {
      drivetrain = "AWD";
    } else if (driveType.includes("rwd") || driveType.includes("rear wheel")) {
      drivetrain = "RWD";
    } else if (driveType.includes("fwd") || driveType.includes("front wheel")) {
      drivetrain = "FWD";
    }

    return {
      year: result.ModelYear ? parseInt(result.ModelYear) : undefined,
      make: result.Make || undefined,
      model: result.Model || undefined,
      trim: result.Trim || undefined,
      bodyType: result.BodyClass || undefined,
      drivetrain,
      engine: result.EngineConfiguration || result.EngineModel || undefined,
      range: result.ElectrificationLevel?.toLowerCase().includes("bev") ? undefined : undefined, // range is harder to get from NHTSA
      horsepower: result.EngineHP || undefined,
    };
  } catch (error) {
    console.error("VIN decoding failed:", error);
    return null;
  }
}
