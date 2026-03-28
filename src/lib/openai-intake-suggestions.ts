/**
 * Server-only OpenAI call for Phase 2A intake field suggestions.
 * No OpenAI imports in client bundles.
 */

import OpenAI from "openai";
import type { VinMetadata } from "@/lib/vin";
import type { VehicleIntakeAiSuggestions } from "@/types/vehicle-intake-ai";
import { withTimeout } from "@/lib/vin-extraction";

const MAX_DOC_CHARS = 14_000;
const OPENAI_MS = 45_000;

/** Strict JSON Schema for Chat Completions structured output (subset supported by OpenAI). */
const INTAKE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    mileage: { type: "integer" },
    mileage_confidence: { type: "number" },
    exterior_color: { type: "string" },
    exterior_color_confidence: { type: "number" },
    interior_color: { type: "string" },
    interior_color_confidence: { type: "number" },
    title_status_hint: {
      type: "string",
      enum: ["CLEAN", "SALVAGE", "REBUILT", "LEMON", "NONE"],
    },
    title_status_confidence: { type: "number" },
    title_notes: { type: "string" },
    transmission_suggestion: { type: "string" },
    transmission_confidence: { type: "number" },
    drivetrain_suggestion: {
      type: "string",
      enum: ["AWD", "RWD", "FWD", "NONE"],
    },
    drivetrain_confidence: { type: "number" },
    condition_notes_draft: { type: "string" },
    condition_notes_confidence: { type: "number" },
    internal_notes_draft: { type: "string" },
    internal_notes_confidence: { type: "number" },
    highlight_suggestions: {
      type: "array",
      items: { type: "string" },
      maxItems: 8,
    },
    feature_suggestions: {
      type: "array",
      items: { type: "string" },
      maxItems: 12,
    },
  },
  required: [
    "mileage",
    "mileage_confidence",
    "exterior_color",
    "exterior_color_confidence",
    "interior_color",
    "interior_color_confidence",
    "title_status_hint",
    "title_status_confidence",
    "title_notes",
    "transmission_suggestion",
    "transmission_confidence",
    "drivetrain_suggestion",
    "drivetrain_confidence",
    "condition_notes_draft",
    "condition_notes_confidence",
    "internal_notes_draft",
    "internal_notes_confidence",
    "highlight_suggestions",
    "feature_suggestions",
  ],
} as const;

function normalizeSuggestions(
  raw: Record<string, unknown>,
  decoded: VinMetadata | null
): VehicleIntakeAiSuggestions {
  const mileageRaw = raw.mileage;
  const mileage =
    typeof mileageRaw === "number" && mileageRaw >= 0 && mileageRaw < 2_000_000 ? mileageRaw : null;

  const emptyToNull = (s: unknown) => {
    if (typeof s !== "string") return null;
    const t = s.trim();
    return t.length === 0 ? null : t;
  };

  const clip = (s: string | null, max: number) => (s && s.length > max ? s.slice(0, max) : s);

  const titleHintRaw = raw.title_status_hint;
  const titleStatusHint =
    titleHintRaw === "CLEAN" ||
    titleHintRaw === "SALVAGE" ||
    titleHintRaw === "REBUILT" ||
    titleHintRaw === "LEMON"
      ? titleHintRaw
      : null;

  const dtRaw = raw.drivetrain_suggestion;
  const drivetrainSuggestion =
    dtRaw === "AWD" || dtRaw === "RWD" || dtRaw === "FWD" ? dtRaw : null;

  const highlights = Array.isArray(raw.highlight_suggestions)
    ? (raw.highlight_suggestions as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const features = Array.isArray(raw.feature_suggestions)
    ? (raw.feature_suggestions as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  let transmissionSuggestion = emptyToNull(raw.transmission_suggestion);
  let drivetrainOut: VehicleIntakeAiSuggestions["drivetrainSuggestion"] = drivetrainSuggestion;

  if (decoded?.transmission) {
    transmissionSuggestion = null;
  }
  if (decoded?.drivetrain) {
    drivetrainOut = null;
  }

  return {
    mileage,
    mileageConfidence: typeof raw.mileage_confidence === "number" ? raw.mileage_confidence : null,
    exteriorColor: clip(emptyToNull(raw.exterior_color), 120),
    exteriorColorConfidence:
      typeof raw.exterior_color_confidence === "number" ? raw.exterior_color_confidence : null,
    interiorColor: clip(emptyToNull(raw.interior_color), 120),
    interiorColorConfidence:
      typeof raw.interior_color_confidence === "number" ? raw.interior_color_confidence : null,
    titleStatusHint,
    titleStatusConfidence:
      typeof raw.title_status_confidence === "number" ? raw.title_status_confidence : null,
    titleNotes: clip(emptyToNull(raw.title_notes), 2000),
    transmissionSuggestion: clip(transmissionSuggestion, 80),
    transmissionConfidence:
      typeof raw.transmission_confidence === "number" ? raw.transmission_confidence : null,
    drivetrainSuggestion: drivetrainOut,
    drivetrainConfidence:
      typeof raw.drivetrain_confidence === "number" ? raw.drivetrain_confidence : null,
    conditionNotesDraft: clip(emptyToNull(raw.condition_notes_draft), 2000),
    conditionNotesConfidence:
      typeof raw.condition_notes_confidence === "number" ? raw.condition_notes_confidence : null,
    internalNotesDraft: clip(emptyToNull(raw.internal_notes_draft), 5000),
    internalNotesConfidence:
      typeof raw.internal_notes_confidence === "number" ? raw.internal_notes_confidence : null,
    highlightSuggestions: highlights.map((h) => h.trim().slice(0, 80)).filter(Boolean).slice(0, 8),
    featureSuggestions: features.map((f) => f.trim().slice(0, 120)).filter(Boolean).slice(0, 12),
  };
}

export async function fetchIntakeFieldSuggestionsFromOpenAI(
  documentPlainText: string,
  decoded: VinMetadata | null
): Promise<VehicleIntakeAiSuggestions | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_INTAKE_MODEL?.trim() || "gpt-4o-mini";
  const excerpt = documentPlainText.slice(0, MAX_DOC_CHARS);

  const decoderHint = decoded
    ? `VIN decoder already provided (do not contradict): transmission=${decoded.transmission ?? "none"}, drivetrain=${decoded.drivetrain ?? "none"}. If those are set, return NONE/empty for transmission_suggestion and drivetrain_suggestion.`
    : "VIN decode did not return structured specs; you may suggest transmission and drivetrain if clearly stated in the document.";

  const openai = new OpenAI({
    apiKey,
    maxRetries: 1,
    timeout: OPENAI_MS - 2000,
  });

  const completion = await withTimeout(
    openai.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You extract vehicle listing fields from dealership document text (title, auction, registration). 
Rules:
- Never output or guess VIN, year, make, model, or trim.
- Never output price or listing/marketing description.
- mileage: use a non-negative integer only when the odometer is clearly stated; otherwise use -1 and mileage_confidence 0.
- For uncertain fields use empty string or NONE enums and low confidence.
- title_status_hint: NONE if unclear.
- drivetrain_suggestion: NONE unless clearly stated and decoder did not already supply drivetrain.
- transmission_suggestion: empty string unless clearly stated and decoder did not already supply transmission.
- highlight_suggestions: short factual chips only (max 8), not ad copy.
- feature_suggestions: optional equipment lines (max 12), not marketing.
${decoderHint}`,
        },
        {
          role: "user",
          content: `Document text:\n\n${excerpt}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "vehicle_intake_suggestions",
          strict: true,
          schema: INTAKE_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    }),
    OPENAI_MS,
    "OpenAI intake"
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }

  return normalizeSuggestions(parsed, decoded);
}
