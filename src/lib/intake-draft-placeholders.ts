/**
 * System-seeded values for vehicles created via document intake (placeholder draft).
 * Decoder merge treats these as replaceable; real user-entered values stay protected.
 */

export const INTAKE_PLACEHOLDER_MAKE = "Pending";
export const INTAKE_PLACEHOLDER_MODEL = "Intake";

export function isIntakePlaceholderMake(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === INTAKE_PLACEHOLDER_MAKE.toLowerCase();
}

export function isIntakePlaceholderModel(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === INTAKE_PLACEHOLDER_MODEL.toLowerCase();
}

/** Draft identity is still the default triplet — decoder may replace year and drivetrain defaults too. */
export function isIntakePlaceholderIdentityPair(make: unknown, model: unknown): boolean {
  return isIntakePlaceholderMake(make) && isIntakePlaceholderModel(model);
}

/** Minimum listing price stored on intake-created drafts until the dealer sets a real price (schema requires a value). */
export const INTAKE_PLACEHOLDER_PRICE = 1000;

export function isIntakePlaceholderPriceValue(value: unknown): boolean {
  return typeof value === "number" && !Number.isNaN(value) && value === INTAKE_PLACEHOLDER_PRICE;
}
