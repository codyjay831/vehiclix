/**
 * Server-only: dedicated VIN-only extraction via OpenAI.
 * This pass focuses EXCLUSIVELY on identifying the VIN(s) from a document
 * without distractions from other metadata.
 */

import OpenAI, { toFile } from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import { withTimeout, isValidVinCheckDigit } from "@/lib/vin-extraction";
import { intakeTelemetry } from "@/lib/intake-telemetry";

const OPENAI_VIN_ONLY_MS = 45_000;
const PDF_FILE_PROCESS_MAX_MS = 40_000;

const VIN_ONLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    vin_candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          vin: { type: "string" },
          label_found: { type: "string" },
          confidence: { type: "number" },
          is_barcode: { type: "boolean" },
        },
        required: ["vin", "label_found", "confidence", "is_barcode"],
      },
    },
    best_guess_vin: { type: "string" },
    reasoning: { type: "string" },
  },
  required: ["vin_candidates", "best_guess_vin", "reasoning"],
} as const;

export type VinCandidateFromAi = {
  vin: string;
  labelFound: string;
  confidence: number;
  isBarcode: boolean;
};

export type VinOnlyExtractionResult = {
  candidates: VinCandidateFromAi[];
  bestGuessVin: string | null;
  reasoning: string | null;
};

function parseVinToken(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (u.length !== 17) return null;
  // VIN character set: no I, O, Q
  if (/^[A-HJ-NPR-Z0-9]{17}$/.test(u)) return u;
  return null;
}

const VIN_ONLY_SYSTEM_PROMPT = `You are a high-precision VIN extraction specialist. Your ONLY task is to find the Vehicle Identification Number (VIN) in the provided document (image or PDF).

Rules:
1. Search for any 17-character alphanumeric string that looks like a VIN.
2. Look specifically for labels like "VIN", "Vehicle Identification Number", "Serial No", or barcodes.
3. Be EXTREMELY literal with the characters. Do not hallucinate based on vehicle make/model.
4. If you see a barcode, extract the string it represents.
5. Provide ALL potential VIN candidates you find, especially if there are multiple documents or one is ambiguous.
6. For each candidate:
   - 'vin': the literal 17 characters found.
   - 'label_found': the text label near the VIN (e.g. "VIN label on dashboard", "Title document field").
   - 'confidence': 0.0 to 1.0.
   - 'is_barcode': true if this was read from a visible barcode.
7. 'best_guess_vin': the single most likely correct VIN. If multiple valid VINs exist, pick the one that represents the vehicle (e.g. on a title document, pick the primary VIN field).
8. 'reasoning': briefly explain why you chose the best guess or why it was difficult.

Important: A valid VIN never contains the letters I, O, or Q. If you see them, they are likely OCR errors (e.g., I=1, O=0, Q=0). Correct them in your output only if you are CERTAIN, otherwise set confidence low.`;

/**
 * Runs a dedicated VIN-only pass with OpenAI.
 */
export async function extractVinOnlyWithOpenAI(params: {
  buffer: Buffer;
  mime: "application/pdf" | "image/jpeg" | "image/png";
  apiKeyOverride?: string;
}): Promise<VinOnlyExtractionResult | null> {
  const apiKey = params.apiKeyOverride?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_INTAKE_MODEL?.trim() || "gpt-4o";
  const openai = new OpenAI({
    apiKey,
    maxRetries: 2,
    timeout: OPENAI_VIN_ONLY_MS - 2000,
  });

  let userContent: ChatCompletionContentPart[] = [];
  let fileId: string | undefined;

  try {
    if (params.mime === "application/pdf") {
      intakeTelemetry("intake_vin_only_pdf_upload", { size: params.buffer.length });
      const uploadable = await toFile(params.buffer, "vin-only-intake.pdf", { type: "application/pdf" });
      const created = await openai.files.create({ file: uploadable, purpose: "user_data" });
      fileId = created.id;

      await openai.files.waitForProcessing(fileId, {
        maxWait: PDF_FILE_PROCESS_MAX_MS,
        pollInterval: 500,
      });

      userContent = [
        { type: "text", text: "Identify all VINs in this PDF document. Focus on precision." },
        { type: "file", file: { file_id: fileId } },
      ];
    } else {
      const dataUrl = `data:${params.mime};base64,${params.buffer.toString("base64")}`;
      userContent = [
        { type: "text", text: "Identify all VINs in this image. Focus on precision and literal character reading." },
        { type: "image_url", image_url: { url: dataUrl } },
      ];
    }

    const completion = await withTimeout(
      openai.chat.completions.create({
        model,
        temperature: 0.0, // Maximum precision
        messages: [
          { role: "system", content: VIN_ONLY_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "vin_only_extraction",
            strict: true,
            schema: VIN_ONLY_SCHEMA as unknown as Record<string, unknown>,
          },
        },
      }),
      OPENAI_VIN_ONLY_MS,
      "OpenAI VIN-only extraction"
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    const rawCandidates = (parsed.vin_candidates || []) as any[];

    const candidates: VinCandidateFromAi[] = rawCandidates
      .map((c) => ({
        vin: parseVinToken(c.vin) || c.vin, // Parse and normalize
        labelFound: c.label_found || "",
        confidence: typeof c.confidence === "number" ? Math.min(1, Math.max(0, c.confidence)) : 0.5,
        isBarcode: Boolean(c.is_barcode),
      }))
      .filter((c) => c.vin.length === 17); // Keep only 17-char strings

    return {
      candidates,
      bestGuessVin: parseVinToken(parsed.best_guess_vin),
      reasoning: parsed.reasoning || null,
    };
  } catch (e) {
    console.error("[intake-vin-only] pass failed:", e);
    return null;
  } finally {
    if (fileId) await openai.files.delete(fileId).catch(() => {});
  }
}
