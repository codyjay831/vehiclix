/**
 * Server-only OpenAI call for Phase 2A intake field suggestions.
 * SDK is loaded with dynamic import() so the `openai` package is not evaluated at module load time
 * (avoids serverless/bundler issues and keeps GET routes from pulling the full client graph).
 */

import type { VinMetadata } from "@/lib/vin";
import type { VehicleIntakeAiSuggestions } from "@/types/vehicle-intake-ai";
import { withTimeout } from "@/lib/vin-extraction";

const MAX_DOC_CHARS = 14_000;
const OPENAI_MS = 45_000;

/**
 * Strict JSON Schema for Chat Completions structured output.
 * Supporting fields only — never VIN, year, make, model, trim, price, transmission, drivetrain, or public listing copy.
 */
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
    "condition_notes_draft",
    "condition_notes_confidence",
    "internal_notes_draft",
    "internal_notes_confidence",
    "highlight_suggestions",
    "feature_suggestions",
  ],
} as const;

function normalizeSuggestions(raw: Record<string, unknown>): VehicleIntakeAiSuggestions {
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

  const highlights = Array.isArray(raw.highlight_suggestions)
    ? (raw.highlight_suggestions as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const features = Array.isArray(raw.feature_suggestions)
    ? (raw.feature_suggestions as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

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

  let OpenAI: (typeof import("openai"))["default"];
  try {
    ({ default: OpenAI } = await import("openai"));
  } catch (e) {
    console.error("[intake] openai package failed to load (degrading to decode-only):", e);
    return null;
  }

  const model = process.env.OPENAI_INTAKE_MODEL?.trim() || "gpt-4o-mini";
  const excerpt = documentPlainText.slice(0, MAX_DOC_CHARS);

  const decoderContext =
    decoded &&
    (decoded.year != null ||
      (decoded.make && decoded.make.trim()) ||
      (decoded.model && decoded.model.trim()))
      ? `Decoder context for disambiguation only (do not output these): year=${decoded.year ?? "?"}, make=${decoded.make ?? "?"}, model=${decoded.model ?? "?"}.`
      : "No decoder context; still do not guess identity fields.";

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
          content: `You read dealership document text (title, auction sheet, registration) and return ONLY the JSON schema fields.

Hard bans (never output or infer): VIN, year, make, model, trim, price, transmission, drivetrain, public listing description, ad copy, or marketing prose.

Allowed outputs:
- mileage: non-negative integer only if the odometer is explicitly stated in the text; otherwise mileage = -1 and mileage_confidence = 0.
- exterior_color / interior_color: literal colors from the document; empty string if not stated. Use confidence 0–1; use <=0.3 when guessing from weak hints.
- title_status_hint: CLEAN, SALVAGE, REBUILT, LEMON only when explicitly indicated; otherwise NONE. Never invent a branded title story.
- title_notes: short factual phrases visible in the document (brands, lien, duplicate, etc.); empty if none.
- condition_notes_draft / internal_notes_draft: concise factual notes from the document only; empty if nothing useful.
- highlight_suggestions: up to 8 short factual chips (e.g. equipment), not slogans.
- feature_suggestions: up to 12 optional equipment lines from the document, not sales copy.

Confidence fields: 0.0 = unknown/not applicable; reserve values above 0.7 only when the text clearly states the fact.

${decoderContext}`,
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

  return normalizeSuggestions(parsed);
}
