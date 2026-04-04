import {
  isIntakePlaceholderIdentityPair,
  isIntakePlaceholderPriceValue,
} from "@/lib/intake-draft-placeholders";

const VIN_TAIL_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";

function isPlaceholderColor(value: unknown): boolean {
  const t = String(value ?? "").trim().toUpperCase();
  return t === "" || t === "TBD" || t === "N/A" || t === "UNKNOWN";
}

/**
 * Human-readable checklist after document intake (VIN decode + optional AI), excluding price automation.
 */
export function computeIntakeStillNeededLabels(params: {
  vin: string;
  make: string;
  model: string;
  mileage: number;
  exteriorColor: string;
  interiorColor: string;
  price: number | "";
  decodeFailed: boolean;
  /** Existing saved images + newly selected files (create or edit). */
  totalPhotoCount: number;
  aiAutoAppliedIdentityKeys?: string[];
}): string[] {
  const out: string[] = [];
  const vin = (params.vin || "").trim().toUpperCase();
  if (vin.length !== 17 || /^0INTAKE/.test(vin)) {
    out.push("Valid retail VIN (17 characters)");
  }
  const aiApplied = params.aiAutoAppliedIdentityKeys ?? [];
  const hasAiIdentity = aiApplied.includes("year") || aiApplied.includes("make") || aiApplied.includes("model");
  if (params.decodeFailed && !hasAiIdentity) {
    out.push("Vehicle identity (VIN decode failed — verify VIN or enter year/make/model manually)");
  } else if (params.decodeFailed && hasAiIdentity) {
    out.push("Vehicle identity (AI-filled from document — confirm year/make/model are correct)");
  }
  if (isIntakePlaceholderIdentityPair(params.make, params.model)) {
    out.push("Make and model (confirm decoder output)");
  }
  if (params.mileage === 0 || params.mileage == null || Number.isNaN(params.mileage)) {
    out.push("Mileage");
  }
  if (isPlaceholderColor(params.exteriorColor)) {
    out.push("Exterior color");
  }
  if (isPlaceholderColor(params.interiorColor)) {
    out.push("Interior color");
  }
  const pr = params.price;
  const priceUnset =
    pr === "" ||
    pr === undefined ||
    (typeof pr === "number" && (Number.isNaN(pr) || isIntakePlaceholderPriceValue(pr)));
  if (priceUnset) {
    out.push("Listing price (manual)");
  }
  if (params.totalPhotoCount < 1) {
    out.push("At least one photo");
  }
  return out;
}

export function isProvisionalIntakeVin(vin: string): boolean {
  const v = vin.trim().toUpperCase();
  // Support both 0INTAKE and @INTAKE (visual/legacy compatibility)
  return /^[0@]INTAKE[A-HJ-NPR-Z0-9]{10}$/.test(v);
}

/** 17-char placeholder unique per caller checks; not a road-legal VIN (decode not required). */
export function randomProvisionalVin(): string {
  let tail = "";
  for (let i = 0; i < 10; i++) {
    tail += VIN_TAIL_CHARS[Math.floor(Math.random() * VIN_TAIL_CHARS.length)]!;
  }
  return `0INTAKE${tail}`;
}
