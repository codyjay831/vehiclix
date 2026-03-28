/**
 * Phase 2A: OpenAI-assisted document suggestions (server → client JSON only).
 * Not persisted separately; merged into the form with fill-empty rules on the client.
 */

export type TitleStatusHint = "CLEAN" | "SALVAGE" | "REBUILT" | "LEMON";

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
};

export type VehicleIntakeAiMeta =
  | { status: "applied" }
  | { status: "skipped"; reason: "no_api_key" }
  | { status: "skipped"; reason: "openai_error"; message?: string };
