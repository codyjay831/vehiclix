import { VehicleWithMedia } from "@/types";
import { SerializedVehicleWithMedia } from "./vehicle-serialization";
import { 
  isIntakePlaceholderIdentityPair, 
  isIntakePlaceholderPriceValue 
} from "./intake-draft-placeholders";

export type ReadinessIssue = {
  message: string;
  field?: string;
};

export type VehicleReadiness = {
  isReadyForUnpublished: boolean;
  isReadyForPublished: boolean;
  blockingUnpublished: ReadinessIssue[];
  blockingPublished: ReadinessIssue[];
  warnings: ReadinessIssue[];
};

/**
 * Computes the readiness of a vehicle for being moved to UNPUBLISHED (staging)
 * or LISTED (published/live).
 */
export function computeVehicleReadiness(vehicle: VehicleWithMedia | SerializedVehicleWithMedia): VehicleReadiness {
  const blockingUnpublished: ReadinessIssue[] = [];
  const blockingPublished: ReadinessIssue[] = [];
  const warnings: ReadinessIssue[] = [];

  // 1. Identification
  if (!vehicle.vin || vehicle.vin.trim().length !== 17) {
    blockingUnpublished.push({ message: "Valid 17-character VIN is required", field: "vin" });
  }
  
  if (isIntakePlaceholderIdentityPair(vehicle.make, vehicle.model)) {
    blockingUnpublished.push({ message: "Vehicle make and model must be identified", field: "make" });
  }

  // 2. Price
  const price = Number(vehicle.price);
  if (isIntakePlaceholderPriceValue(price)) {
    blockingUnpublished.push({ message: "Listing price must be set", field: "price" });
  } else if (price < 1000) {
    blockingPublished.push({ message: "Price must be at least $1,000", field: "price" });
  }

  // 3. Media
  const photoCount = vehicle.media?.filter(m => m.mediaType === "IMAGE").length || 0;
  if (photoCount === 0) {
    blockingUnpublished.push({ message: "At least one photo is required", field: "photos" });
  } else if (photoCount < 3) {
    warnings.push({ message: "Fewer than 3 photos provided", field: "photos" });
  }

  // 4. Description & Marketing
  const hasDescription = vehicle.description && vehicle.description.trim().length > 0;
  if (!hasDescription) {
    blockingPublished.push({ message: "Marketing description is required to publish", field: "description" });
    warnings.push({ message: "No marketing description provided", field: "description" });
  } else if (vehicle.description!.length < 50) {
    warnings.push({ message: "Marketing description is very short", field: "description" });
  }

  if (!vehicle.highlights || vehicle.highlights.length === 0) {
    warnings.push({ message: "No vehicle highlights provided", field: "highlights" });
  }

  // 5. Specs
  if (!vehicle.trim || vehicle.trim.trim().toLowerCase() === "base") {
    // "Base" is often a placeholder or default, we treat it as a warning if not specified
    if (!vehicle.trim) {
      warnings.push({ message: "Trim level is missing", field: "trim" });
    }
  }

  if (!vehicle.exteriorColor) {
    warnings.push({ message: "Exterior color is missing", field: "exteriorColor" });
  }

  // Ready states
  const isReadyForUnpublished = blockingUnpublished.length === 0;
  
  // Published readiness includes all unpublished blockers + its own blockers
  const isReadyForPublished = isReadyForUnpublished && blockingPublished.length === 0;

  return {
    isReadyForUnpublished,
    isReadyForPublished,
    blockingUnpublished,
    blockingPublished,
    warnings
  };
}
