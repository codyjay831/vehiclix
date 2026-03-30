/**
 * Server-only: primary vehicle intake extraction via OpenAI.
 * Images use vision (data URL). PDFs use the Files API + chat `file` input (no server-side rasterization).
 */

import OpenAI, { toFile } from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import type { VehicleIntakeAiExtraction, VehicleIntakeAiSuggestions } from "@/types/vehicle-intake-ai";
import { withTimeout } from "@/lib/vin-extraction";
import { intakeTelemetry } from "@/lib/intake-telemetry";

const OPENAI_EXTRACTION_MS = 60_000;
const PDF_FILE_PROCESS_MAX_MS = 45_000;

const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    vin: { type: "string" },
    year: { type: "integer" },
    make: { type: "string" },
    model: { type: "string" },
    trim: { type: "string" },
    mileage: { type: "integer" },
    plate: { type: "string" },
    title_status: {
      type: "string",
      enum: ["CLEAN", "SALVAGE", "REBUILT", "LEMON", "NONE"],
    },
    notes: { type: "string" },
    raw_text_summary: { type: "string" },
    source_type_guess: {
      type: "string",
      enum: ["title", "registration", "listing_screenshot", "sticker", "other"],
    },
    confidence_overall: { type: "number" },
    confidence_vin: { type: "number" },
    confidence_year: { type: "number" },
    confidence_make: { type: "number" },
    confidence_model: { type: "number" },
    confidence_trim: { type: "number" },
    confidence_mileage: { type: "number" },
    confidence_plate: { type: "number" },
    confidence_title_status: { type: "number" },
  },
  required: [
    "vin",
    "year",
    "make",
    "model",
    "trim",
    "mileage",
    "plate",
    "title_status",
    "notes",
    "raw_text_summary",
    "source_type_guess",
    "confidence_overall",
    "confidence_vin",
    "confidence_year",
    "confidence_make",
    "confidence_model",
    "confidence_trim",
    "confidence_mileage",
    "confidence_plate",
    "confidence_title_status",
  ],
} as const;

function clamp01(n: unknown): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function emptyToNull(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return t.length === 0 ? null : t;
}

/** 17-char VIN-shaped token (checksum not validated here). */
export function parseVinTokenFromAi(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.replace(/\s+/g, "").toUpperCase();
  if (u.length !== 17) return null;
  if (/^[A-HJ-NPR-Z0-9]{17}$/.test(u)) return u;
  return null;
}

export function normalizeVehicleIntakeAiExtraction(raw: Record<string, unknown>): VehicleIntakeAiExtraction {
  const vin = parseVinTokenFromAi(raw.vin);

  const yearRaw = raw.year;
  let year: number | null = null;
  if (typeof yearRaw === "number" && yearRaw >= 1900 && yearRaw <= new Date().getFullYear() + 1) {
    year = yearRaw;
  }

  const mileageRaw = raw.mileage;
  const mileage =
    typeof mileageRaw === "number" && mileageRaw >= 0 && mileageRaw < 2_000_000 ? mileageRaw : null;

  const titleRaw = raw.title_status;
  const titleStatus =
    titleRaw === "CLEAN" ||
    titleRaw === "SALVAGE" ||
    titleRaw === "REBUILT" ||
    titleRaw === "LEMON"
      ? titleRaw
      : null;

  const st = raw.source_type_guess;
  const sourceTypeGuess =
    st === "title" ||
    st === "registration" ||
    st === "listing_screenshot" ||
    st === "sticker" ||
    st === "other"
      ? st
      : "other";

  const clip = (s: string | null, max: number) => (s && s.length > max ? s.slice(0, max) : s);

  return {
    vin,
    year,
    make: clip(emptyToNull(raw.make), 80),
    model: clip(emptyToNull(raw.model), 80),
    trim: clip(emptyToNull(raw.trim), 120),
    mileage,
    plate: clip(emptyToNull(raw.plate), 32),
    titleStatus,
    confidence: {
      overall: clamp01(raw.confidence_overall),
      vin: typeof raw.confidence_vin === "number" ? clamp01(raw.confidence_vin) : null,
      year: typeof raw.confidence_year === "number" ? clamp01(raw.confidence_year) : null,
      make: typeof raw.confidence_make === "number" ? clamp01(raw.confidence_make) : null,
      model: typeof raw.confidence_model === "number" ? clamp01(raw.confidence_model) : null,
      trim: typeof raw.confidence_trim === "number" ? clamp01(raw.confidence_trim) : null,
      mileage: typeof raw.confidence_mileage === "number" ? clamp01(raw.confidence_mileage) : null,
      plate: typeof raw.confidence_plate === "number" ? clamp01(raw.confidence_plate) : null,
      titleStatus:
        typeof raw.confidence_title_status === "number" ? clamp01(raw.confidence_title_status) : null,
    },
    notes: clip(emptyToNull(raw.notes), 2000),
    rawTextSummary: clip(emptyToNull(raw.raw_text_summary), 500),
    sourceTypeGuess,
  };
}

/**
 * Maps primary extraction into the existing Phase 2A suggestion shape for deferred UI review.
 */
export function mapVehicleIntakeExtractionToSuggestions(
  extraction: VehicleIntakeAiExtraction
): VehicleIntakeAiSuggestions {
  const internalBits: string[] = [];
  if (extraction.plate) internalBits.push(`Plate (AI): ${extraction.plate}`);
  internalBits.push(`Document type (AI): ${extraction.sourceTypeGuess.replace(/_/g, " ")}`);
  if (extraction.rawTextSummary) internalBits.push(`Summary: ${extraction.rawTextSummary}`);

  return {
    mileage: extraction.mileage,
    mileageConfidence: extraction.confidence.mileage,
    exteriorColor: null,
    exteriorColorConfidence: null,
    interiorColor: null,
    interiorColorConfidence: null,
    titleStatusHint: extraction.titleStatus,
    titleStatusConfidence: extraction.confidence.titleStatus,
    titleNotes: extraction.notes,
    conditionNotesDraft: null,
    conditionNotesConfidence: null,
    internalNotesDraft: internalBits.length > 0 ? internalBits.join("\n") : null,
    internalNotesConfidence: extraction.confidence.overall,
    highlightSuggestions: [],
    featureSuggestions: [],
    suggestedYear: extraction.year,
    suggestedMake: extraction.make,
    suggestedModel: extraction.model,
    suggestedTrim: extraction.trim,
    suggestedYearConfidence: extraction.confidence.year,
    suggestedMakeConfidence: extraction.confidence.make,
    suggestedModelConfidence: extraction.confidence.model,
    suggestedTrimConfidence: extraction.confidence.trim,
  };
}

export type IntakeExtractionInputKind = "image" | "pdf";

export type ExtractVehicleIntakeWithOpenAIResult = {
  extraction: VehicleIntakeAiExtraction | null;
  inputKind: IntakeExtractionInputKind;
};

async function runStructuredIntakeCompletion(
  openai: OpenAI,
  model: string,
  systemPrompt: string,
  userContent: ChatCompletionContentPart[]
): Promise<VehicleIntakeAiExtraction | null> {
  const completion = await withTimeout(
    openai.chat.completions.create({
      model,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "vehicle_intake_extraction",
          strict: true,
          schema: EXTRACTION_SCHEMA as unknown as Record<string, unknown>,
        },
      },
    }),
    OPENAI_EXTRACTION_MS,
    "OpenAI intake extraction"
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }

  return normalizeVehicleIntakeAiExtraction(parsed);
}

const SYSTEM_PROMPT = `You extract structured vehicle data from dealership documents, title images, registration photos, listing screenshots, window stickers, or scans.

Rules:
- Return ONLY the JSON schema fields. Use empty string for unknown text fields. Use -1 for unknown year or mileage when the schema requires integers (year/mileage).
- VIN: 17 valid VIN characters (no I/O/Q) if clearly visible; otherwise empty string. Never guess a full VIN from partial digits.
- Year: model year integer only if clearly stated; else -1.
- Make/model/trim: literal visible text; empty string if not visible.
- Mileage/odometer: non-negative integer if explicitly shown; else -1.
- Plate: license plate string if visible; else empty.
- title_status: CLEAN, SALVAGE, REBUILT, LEMON only when explicitly indicated; else NONE.
- notes: short factual notes from the document only.
- raw_text_summary: at most 2 sentences summarizing visible key facts (no PII beyond what is vehicle-related).
- source_type_guess: best guess of document type.
- Confidence fields 0.0–1.0: use 0 when unknown; reserve high values only when clearly readable. confidence_overall reflects overall extraction reliability.`;

/**
 * Runs OpenAI structured extraction. Images use vision; PDFs use uploaded file + chat file input.
 * Returns null only if OpenAI cannot be used (no key, SDK load failure).
 */
export async function extractVehicleIntakeWithOpenAI(params: {
  buffer: Buffer;
  mime: "application/pdf" | "image/jpeg" | "image/png";
  apiKeyOverride?: string;
}): Promise<ExtractVehicleIntakeWithOpenAIResult | null> {
  const apiKey = params.apiKeyOverride?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_INTAKE_MODEL?.trim() || "gpt-4o";
  const openai = new OpenAI({
    apiKey,
    maxRetries: 1,
    timeout: OPENAI_EXTRACTION_MS - 2000,
  });

  if (params.mime === "application/pdf") {
    let fileId: string | undefined;
    try {
      intakeTelemetry("intake_pdf_upload_start", { size: params.buffer.length });
      const uploadable = await toFile(params.buffer, "vehicle-intake.pdf", { type: "application/pdf" });
      const created = await openai.files.create({ file: uploadable, purpose: "user_data" });
      fileId = created.id;

      const processed = await openai.files.waitForProcessing(fileId, {
        maxWait: PDF_FILE_PROCESS_MAX_MS,
        pollInterval: 500,
      });
      intakeTelemetry("intake_pdf_processed", { status: processed.status, fileId });
      if (processed.status === "error") {
        return { extraction: null, inputKind: "pdf" };
      }

      const userText =
        "This is one uploaded PDF (all pages). Read the full document and extract vehicle data; the VIN is often on an early page.";
      const extraction = await runStructuredIntakeCompletion(openai, model, SYSTEM_PROMPT, [
        { type: "text", text: userText },
        { type: "file", file: { file_id: fileId } },
      ]);
      return { extraction, inputKind: "pdf" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[intake] PDF extraction failed:", e);
      intakeTelemetry("intake_pdf_error", { error: msg });
      return { extraction: null, inputKind: "pdf" };
    } finally {
      if (fileId) await openai.files.delete(fileId).catch(() => {});
    }
  }

  const dataUrl = `data:${params.mime};base64,${params.buffer.toString("base64")}`;
  const userText = "Extract vehicle data from this image. Read all visible text carefully.";
  try {
    intakeTelemetry("intake_image_start", { size: params.buffer.length });
    const extraction = await runStructuredIntakeCompletion(openai, model, SYSTEM_PROMPT, [
      { type: "text", text: userText },
      { type: "image_url", image_url: { url: dataUrl } },
    ]);
    return { extraction, inputKind: "image" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    intakeTelemetry("intake_image_error", { error: msg });
    return { extraction: null, inputKind: "image" };
  }
}
