/**
 * Phase 2A: OpenAI-assisted document suggestions (server → client JSON only).
 * Not persisted separately; merged into the form with fill-empty rules on the client.
 */

export type TitleStatusHint = "CLEAN" | "SALVAGE" | "REBUILT" | "LEMON";

export type IntakeSourceTypeGuess =
  | "title"
  | "registration"
  | "listing_screenshot"
  | "sticker"
  | "other";

export type IntakeConfidence = {
  overall: number;
  vin: number | null;
  year: number | null;
  make: number | null;
  model: number | null;
  trim: number | null;
  mileage: number | null;
  plate: number | null;
  titleStatus: number | null;
};

export type VehicleIntakeAiExtraction = {
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  mileage: number | null;
  plate: string | null;
  titleStatus: TitleStatusHint | null;
  confidence: IntakeConfidence;
  notes: string | null;
  rawTextSummary: string | null;
  sourceTypeGuess: IntakeSourceTypeGuess;
};

export type VehicleIntakeAiSuggestions = {
  mileage: number | null;
  mileageConfidence: number | null;
  exteriorColor: string | null;
  exteriorColorConfidence: number | null;
  interiorColor: string | null;
  interiorColorConfidence: number | null;
  titleStatusHint: TitleStatusHint | null;
  titleStatusConfidence: number | null;
  titleNotes: string | null;
  conditionNotesDraft: string | null;
  conditionNotesConfidence: number | null;
  internalNotesDraft: string | null;
  internalNotesConfidence: number | null;
  highlightSuggestions: string[];
  featureSuggestions: string[];
  /** Identity hints from primary extraction; client shows Accept when decode failed (see deferred review). */
  suggestedYear?: number | null;
  suggestedMake?: string | null;
  suggestedModel?: string | null;
  suggestedTrim?: string | null;
  suggestedYearConfidence?: number | null;
  suggestedMakeConfidence?: number | null;
  suggestedModelConfidence?: number | null;
  suggestedTrimConfidence?: number | null;
};

export type VehicleIntakeAiMeta =
  | {
      status: "applied";
      extractionInput?: "image" | "pdf";
      secondarySuggestions?: boolean;
    }
  | { status: "skipped"; reason: "no_api_key" | "openai_error" | "extraction_unusable"; message?: string };
