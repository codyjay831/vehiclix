"use server";

import { Drivetrain, InventoryCondition, Prisma, Role, TitleStatus, VehicleStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireWriteAccess } from "@/lib/support";
import { requireUserWithOrg } from "@/lib/auth";
import { saveFile } from "@/lib/storage";
import { decodeVin } from "@/lib/vin";
import { generateUniqueVehicleSlug } from "@/lib/vehicle-slug";
import { collectRankedVinCandidates, isValidVinCheckDigit, withTimeout } from "@/lib/vin-extraction";
import {
  extractTextFromImageBuffer,
  extractTextFromPdfBuffer,
  ImageOcrFailureError,
} from "@/lib/vin-extraction-server";
import { isProvisionalIntakeVin, randomProvisionalVin } from "@/lib/vehicle-intake-helpers";
import { isVinUnique } from "@/actions/inventory";
import {
  fetchIntakeFieldSuggestionsFromOpenAI,
  INTAKE_SUGGESTIONS_MAX_DOC_CHARS,
} from "@/lib/openai-intake-suggestions";
import {
  extractVehicleIntakeWithOpenAI,
  mapVehicleIntakeExtractionToSuggestions,
} from "@/lib/openai-intake-extraction";
import type { VehicleIntakeAiExtraction, VehicleIntakeAiMeta, VehicleIntakeAiSuggestions } from "@/types/vehicle-intake-ai";
import { intakeTelemetry } from "@/lib/intake-telemetry";
import {
  INTAKE_PLACEHOLDER_MAKE,
  INTAKE_PLACEHOLDER_MODEL,
  INTAKE_PLACEHOLDER_PRICE,
} from "@/lib/intake-draft-placeholders";
import {
  INTAKE_OVERALL_MIN_FOR_AUTO_VIN,
  INTAKE_VIN_AUTO_ACCEPT_CONFIDENCE,
} from "@/lib/intake-ai-confidence";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);

const PDF_TEXT_MS = 25_000;
const IMAGE_OCR_MS = 65_000;
const AI_EXTRACTION_MS = 62_000;

/** Set INTAKE_AI_PRIMARY=0 to skip AI and use legacy text/OCR path only. */
function isIntakeAiPrimaryEnabled(): boolean {
  return process.env.INTAKE_AI_PRIMARY !== "0";
}

type IntakeExtractionFailureClass =
  | "timeout"
  | "network"
  | "tesseract_init"
  | "pdf_parse"
  | "image_too_large_pixels"
  | "unknown";

function classifyIntakeTextExtractionFailure(
  err: unknown,
  opts: { timedOut: boolean; route: "pdf" | "image" }
): IntakeExtractionFailureClass {
  if (opts.timedOut) return "timeout";
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes("image_too_large_pixels")) {
    return "image_too_large_pixels";
  }
  if (
    msg.includes("network error while fetching") ||
    msg.includes("fetch failed") ||
    msg.includes("failed to fetch") ||
    msg.includes("econnrefused") ||
    msg.includes("enotfound") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("getaddrinfo") ||
    msg.includes("certificate") ||
    msg.includes("ssl") ||
    msg.includes("tls")
  ) {
    return "network";
  }
  if (opts.route === "pdf") {
    if (
      msg.includes("pdf") ||
      msg.includes("xref") ||
      msg.includes("password") ||
      msg.includes("startxref") ||
      msg.includes("trailer") ||
      msg.includes("pdfium") ||
      msg.includes("pdfjs")
    ) {
      return "pdf_parse";
    }
    return "unknown";
  }
  if (
    msg.includes("traineddata") ||
    msg.includes("tesseract") ||
    msg.includes("lstm") ||
    msg.includes("wasm") ||
    msg.includes("initializing")
  ) {
    return "tesseract_init";
  }
  return "unknown";
}

const LOCKED: VehicleStatus[] = ["RESERVED", "UNDER_CONTRACT", "SOLD"];

function textLengthBucket(len: number): "empty" | "small" | "medium" | "large" {
  if (len <= 0) return "empty";
  if (len <= 500) return "small";
  if (len <= 5000) return "medium";
  return "large";
}

/** Combine legacy/plainText with PDF text from primary pass when the VIN path skipped populating `plainText`. */
function buildEnrichmentDocumentPlainText(plainText: string, pdfPlainTextForFallback: string | undefined): string {
  const a = plainText.trim();
  const b = (pdfPlainTextForFallback ?? "").trim();
  if (a && b && a === b) return a.slice(0, INTAKE_SUGGESTIONS_MAX_DOC_CHARS);
  const parts: string[] = [];
  if (a) parts.push(a);
  if (b && b !== a) parts.push(b);
  if (parts.length === 0) return "";
  return parts.join("\n\n---\n\n").slice(0, INTAKE_SUGGESTIONS_MAX_DOC_CHARS);
}

/** Non-VIN context from primary extraction for second-pass merchandising (highlights, features, notes). */
function buildPrimaryEnrichmentBlock(extraction: VehicleIntakeAiExtraction): string {
  const lines: string[] = [];
  if (extraction.notes?.trim()) lines.push(`Notes: ${extraction.notes.trim()}`);
  if (extraction.rawTextSummary?.trim()) lines.push(`Summary: ${extraction.rawTextSummary.trim()}`);
  if (extraction.mileage != null && extraction.mileage >= 0) {
    lines.push(`Stated odometer: ${extraction.mileage}`);
  }
  if (extraction.plate?.trim()) lines.push(`Plate: ${extraction.plate.trim()}`);
  if (extraction.titleStatus) {
    lines.push(`Title status cue: ${extraction.titleStatus}`);
  }
  lines.push(`Document kind guess: ${extraction.sourceTypeGuess.replace(/_/g, " ")}`);
  return lines.join("\n");
}

function mergeTextIntakeLayers(
  a: string | null | undefined,
  b: string | null | undefined,
  maxLen: number
): string | null {
  const ta = (a ?? "").trim();
  const tb = (b ?? "").trim();
  if (!ta) return tb.length ? tb.slice(0, maxLen) : null;
  if (!tb) return ta.slice(0, maxLen);
  const tl = ta.toLowerCase();
  const bl = tb.toLowerCase();
  if (bl.includes(tl) || tl.includes(bl)) {
    return (ta.length >= tb.length ? ta : tb).slice(0, maxLen);
  }
  const out = `${ta}\n\n${tb}`.trim();
  return out.length > maxLen ? out.slice(0, maxLen) : out;
}

function mergeIntakeAiSuggestions(
  base: VehicleIntakeAiSuggestions,
  extra: VehicleIntakeAiSuggestions | null
): VehicleIntakeAiSuggestions {
  if (!extra) return base;
  const hl = [...base.highlightSuggestions];
  for (const h of extra.highlightSuggestions) {
    if (!hl.includes(h)) hl.push(h);
    if (hl.length >= 8) break;
  }
  const ft = [...base.featureSuggestions];
  for (const f of extra.featureSuggestions) {
    if (!ft.includes(f)) ft.push(f);
    if (ft.length >= 12) break;
  }

  const mileage =
    base.mileage != null && base.mileage >= 0
      ? base.mileage
      : extra.mileage != null && extra.mileage >= 0
        ? extra.mileage
        : null;
  const mileageConfidence =
    base.mileage != null && base.mileage >= 0 ? base.mileageConfidence : extra.mileageConfidence;

  const titleHint = base.titleStatusHint ?? extra.titleStatusHint;
  const titleConf =
    titleHint != null && titleHint === base.titleStatusHint
      ? base.titleStatusConfidence
      : titleHint != null && titleHint === extra.titleStatusHint
        ? extra.titleStatusConfidence
        : base.titleStatusConfidence ?? extra.titleStatusConfidence;

  const condDraft = base.conditionNotesDraft ?? extra.conditionNotesDraft;
  const condConf =
    condDraft == null
      ? null
      : base.conditionNotesDraft != null
        ? base.conditionNotesConfidence
        : extra.conditionNotesConfidence;

  return {
    ...base,
    mileage,
    mileageConfidence,
    titleStatusHint: titleHint,
    titleStatusConfidence: titleConf,
    titleNotes: mergeTextIntakeLayers(base.titleNotes, extra.titleNotes, 2000),
    internalNotesDraft: mergeTextIntakeLayers(base.internalNotesDraft, extra.internalNotesDraft, 5000),
    exteriorColor: base.exteriorColor ?? extra.exteriorColor,
    exteriorColorConfidence: base.exteriorColorConfidence ?? extra.exteriorColorConfidence,
    interiorColor: base.interiorColor ?? extra.interiorColor,
    interiorColorConfidence: base.interiorColorConfidence ?? extra.interiorColorConfidence,
    conditionNotesDraft: condDraft,
    conditionNotesConfidence: condConf,
    highlightSuggestions: hl.slice(0, 8),
    featureSuggestions: ft.slice(0, 12),
  };
}

async function runIntakeEnrichmentSecondPass(
  enrichmentDocumentText: string,
  primaryEnrichmentBlock: string,
  decoded: Awaited<ReturnType<typeof decodeVin>>
): Promise<VehicleIntakeAiSuggestions | null> {
  if (!enrichmentDocumentText.trim() && !primaryEnrichmentBlock.trim()) {
    return null;
  }
  return fetchIntakeFieldSuggestionsFromOpenAI(enrichmentDocumentText, decoded, {
    primaryEnrichmentBlock: primaryEnrichmentBlock.trim() || undefined,
  });
}

/**
 * Phase 2C: non-PII review action for support logs (Accept/Reject in admin UI).
 */
export async function logIntakeReviewEventAction(payload: {
  action: "accept" | "reject";
  fieldGroup: string;
}) {
  await requireWriteAccess();
  const user = await requireUserWithOrg();
  if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
    return;
  }
  intakeTelemetry("intake_review_ui", {
    action: payload.action,
    field_group: payload.fieldGroup.slice(0, 64),
  });
}

export type VehicleIntakeErrorCode =
  | "UPLOAD_FAILED"
  | "UNSUPPORTED_FILE"
  | "FILE_TOO_LARGE"
  | "NO_VIN_FOUND"
  | "AMBIGUOUS_VIN"
  | "PROCESS_TIMEOUT"
  | "VEHICLE_NOT_FOUND"
  | "VEHICLE_LOCKED";

export type VehicleIntakeResult =
  | {
      ok: true;
      vehicleId: string;
      createdDraft: boolean;
      extractedVin: string;
      decoded: Awaited<ReturnType<typeof decodeVin>>;
      decodeFailed: boolean;
      documentId: string;
      /** User had a non-placeholder VIN that differs from the document — require explicit UI confirmation before applying. */
      requiresVinConfirmation: boolean;
      /**
       * Uncertain VIN from AI (or legacy OCR): never auto-apply VIN/decode until user confirms a candidate (see ocrVinCandidates).
       * decode is null until client confirms and runs decodeVin locally.
       */
      requiresOcrVinReview?: boolean;
      ocrVinCandidates?: string[];
      ambiguousCandidates?: undefined;
      /** Phase 2A: OpenAI field suggestions (null if skipped or failed). */
      aiSuggestions: VehicleIntakeAiSuggestions | null;
      aiMeta: VehicleIntakeAiMeta;
    }
  | {
      ok: false;
      code: VehicleIntakeErrorCode;
      message: string;
      vehicleId?: string;
      createdDraft?: boolean;
      ambiguousCandidates?: string[];
    };

async function ensureUniqueProvisionalVin(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = randomProvisionalVin();
    if (await isVinUnique(candidate)) return candidate;
  }
  throw new Error("Could not allocate provisional VIN");
}

async function createPlaceholderDraftVehicle(
  organizationId: string,
  actor: { id: string; role: Role },
  preferredVin?: string | null
) {
  let vin: string;
  if (
    preferredVin &&
    preferredVin.length === 17 &&
    !isProvisionalIntakeVin(preferredVin) &&
    isValidVinCheckDigit(preferredVin) &&
    (await isVinUnique(preferredVin))
  ) {
    vin = preferredVin.toUpperCase();
  } else {
    vin = await ensureUniqueProvisionalVin();
  }
  const year = new Date().getFullYear();

  return db.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.create({
      data: {
        vin,
        year,
        make: INTAKE_PLACEHOLDER_MAKE,
        model: INTAKE_PLACEHOLDER_MODEL,
        mileage: 0,
        drivetrain: Drivetrain.AWD,
        exteriorColor: "TBD",
        interiorColor: "TBD",
        condition: InventoryCondition.GOOD,
        titleStatus: TitleStatus.CLEAN,
        price: new Prisma.Decimal(INTAKE_PLACEHOLDER_PRICE),
        description: null,
        highlights: [],
        features: [],
        internalNotes: null,
        vehicleStatus: "DRAFT",
        organizationId,
      },
    });

    const slug = await generateUniqueVehicleSlug(tx, organizationId, {
      id: vehicle.id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
    });
    await tx.vehicle.update({
      where: { id: vehicle.id },
      data: { slug },
    });

    await tx.activityEvent.create({
      data: {
        eventType: "vehicle.created",
        entityType: "Vehicle",
        entityId: vehicle.id,
        organizationId,
        actorId: actor.id,
        actorRole: actor.role,
        metadata: { intakePlaceholder: true },
      },
    });

    return vehicle;
  });
}

type LegacyTextResult = {
  plainText: string;
  extractionKind: "pdf_text" | "image_ocr";
  imageOcrMeta?: {
    image_width?: number | null;
    image_height?: number | null;
    image_megapixels?: number | null;
    ocr_pass?: number | null;
    ocr_text_length?: number | null;
    ocr_duration_ms?: number | null;
  };
};

async function extractPlainTextLegacy(
  buffer: Buffer,
  mime: string,
  fileSize: number
): Promise<{ ok: true; data: LegacyTextResult } | { ok: false; error: VehicleIntakeResult }> {
  const extractionKind = mime === "application/pdf" ? "pdf_text" : "image_ocr";
  let imageOcrMeta: LegacyTextResult["imageOcrMeta"];
  let plainText: string;
  try {
    if (mime === "application/pdf") {
      plainText = await withTimeout(extractTextFromPdfBuffer(buffer), PDF_TEXT_MS, "PDF extraction");
    } else {
      const imageResult = await withTimeout(extractTextFromImageBuffer(buffer), IMAGE_OCR_MS, "Image OCR");
      plainText = imageResult.text;
      imageOcrMeta = {
        image_width: imageResult.meta.imageWidth,
        image_height: imageResult.meta.imageHeight,
        image_megapixels: imageResult.meta.imageMegapixels,
        ocr_pass: imageResult.meta.ocrPass,
        ocr_text_length: imageResult.meta.ocrTextLength,
        ocr_duration_ms: imageResult.meta.ocrDurationMs,
      };
    }
    intakeTelemetry("intake_text_extraction", {
      ok: true,
      kind: extractionKind,
      route: "fallback",
      length_bucket: textLengthBucket(plainText.length),
      ...(extractionKind === "image_ocr" ? imageOcrMeta : {}),
    });
    return { ok: true, data: { plainText, extractionKind, imageOcrMeta } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const errName = e instanceof Error ? e.name : "NonError";
    const timedOut = msg.includes("timed out");
    const extractionRoute = mime === "application/pdf" ? "pdf" : "image";
    const failureClass = classifyIntakeTextExtractionFailure(e, { timedOut, route: extractionRoute });
    const preview = msg.slice(0, 200);
    const imageFailureMeta =
      e instanceof ImageOcrFailureError
        ? {
            image_width: e.meta.imageWidth ?? null,
            image_height: e.meta.imageHeight ?? null,
            image_megapixels: e.meta.imageMegapixels ?? null,
          }
        : extractionRoute === "image"
          ? (imageOcrMeta ?? {})
          : {};
    intakeTelemetry("intake_text_extraction", {
      ok: false,
      kind: extractionKind,
      route: "fallback",
      extraction_route: extractionRoute,
      mime: mime.slice(0, 128),
      file_size_bytes: fileSize,
      timed_out: timedOut,
      failure_class: failureClass,
      error_name: errName.slice(0, 80),
      error_message_preview: preview,
      ...imageFailureMeta,
    });
    console.error(
      JSON.stringify({
        scope: "vehiclix:intake",
        event: "intake_text_extraction_failure",
        ts: new Date().toISOString(),
        extraction_kind: extractionRoute,
        mime,
        file_size_bytes: fileSize,
        timed_out: timedOut,
        failure_class: failureClass,
        error_name: errName,
        error_message_preview: preview,
        ...imageFailureMeta,
      })
    );
    if (timedOut) {
      return {
        ok: false,
        error: {
          ok: false,
          code: "PROCESS_TIMEOUT",
          message: "Processing took too long. Try a smaller file or a PDF with selectable text.",
        },
      };
    }
    return {
      ok: false,
      error: {
        ok: false,
        code: "UPLOAD_FAILED",
        message: "We could not read text from this file. Try another scan or enter the VIN manually.",
      },
    };
  }
}

/**
 * Upload a single PDF/JPEG/PNG: AI-first extraction, optional legacy text/OCR fallback,
 * draft + document attach, checksum + decode, client-side form merge.
 */
export async function processVehicleIntakeDocumentAction(formData: FormData): Promise<VehicleIntakeResult> {
  try {
    await requireWriteAccess();
    const user = await requireUserWithOrg();
    if (user.role !== Role.OWNER && user.role !== Role.STAFF && !user.isSupportMode) {
      return { ok: false, code: "UPLOAD_FAILED", message: "Unauthorized." };
    }
    const organizationId = user.organizationId!;
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      intakeTelemetry("intake_upload", { ok: false, reason: "no_file" });
      return { ok: false, code: "UPLOAD_FAILED", message: "No file was uploaded." };
    }

    const vehicleIdRaw = (formData.get("vehicleId") as string | null)?.trim() || "";
    const formVinRaw = (formData.get("formVin") as string | null)?.trim().toUpperCase() || "";

    const mime = (file.type || "").toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      intakeTelemetry("intake_upload", { ok: false, reason: "unsupported_mime" });
      return {
        ok: false,
        code: "UNSUPPORTED_FILE",
        message: "Only PDF, JPG/JPEG, and PNG files are supported.",
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      intakeTelemetry("intake_upload", { ok: false, reason: "file_too_large" });
      return {
        ok: false,
        code: "FILE_TOO_LARGE",
        message: `File must be ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB or smaller.`,
      };
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch {
      intakeTelemetry("intake_buffer", { ok: false });
      return { ok: false, code: "UPLOAD_FAILED", message: "Could not read the uploaded file." };
    }

    const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
    const aiPrimary = isIntakeAiPrimaryEnabled() && hasOpenAiKey;
    const primaryAiIntakeDisabled = !isIntakeAiPrimaryEnabled() && hasOpenAiKey;

    let primaryExtraction: VehicleIntakeAiExtraction | null = null;
    let extractionInputKind: "image" | "pdf_text" | null = null;
    let pdfPlainTextForFallback: string | undefined;

    if (aiPrimary) {
      try {
        const bundle = await withTimeout(
          extractVehicleIntakeWithOpenAI({
            buffer,
            mime: mime as "application/pdf" | "image/jpeg" | "image/png",
          }),
          AI_EXTRACTION_MS,
          "AI intake extraction"
        );
        if (bundle) {
          primaryExtraction = bundle.extraction;
          extractionInputKind = bundle.inputKind;
          pdfPlainTextForFallback = bundle.pdfPlainTextForFallback;
          if (primaryExtraction) {
            intakeTelemetry("intake_ai_primary", { ok: true, input: extractionInputKind });
          } else {
            intakeTelemetry("intake_ai_primary", {
              ok: false,
              reason: "no_extraction",
              input: extractionInputKind,
              pdf_text_reuse: Boolean(pdfPlainTextForFallback),
            });
          }
        } else {
          intakeTelemetry("intake_ai_primary", { ok: false, reason: "null_result" });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const timedOut = msg.toLowerCase().includes("timed out");
        intakeTelemetry("intake_ai_primary", {
          ok: false,
          reason: timedOut ? "timeout" : "error",
        });
      }
    } else {
      intakeTelemetry("intake_ai_primary", {
        ok: false,
        reason: !hasOpenAiKey ? "no_api_key" : "disabled",
      });
    }

    const needsLegacyVin =
      !primaryExtraction ||
      primaryExtraction.vin == null ||
      primaryExtraction.vin.length !== 17;

    let plainText = "";
    let legacyMeta: LegacyTextResult | null = null;

    if (needsLegacyVin) {
      if (mime === "application/pdf" && pdfPlainTextForFallback !== undefined) {
        plainText = pdfPlainTextForFallback;
        legacyMeta = { plainText, extractionKind: "pdf_text" };
        intakeTelemetry("intake_fallback_text", {
          ok: true,
          route: "pdf_reused_from_ai_parse",
          had_ai_extraction: true,
        });
      } else {
        const legacy = await extractPlainTextLegacy(buffer, mime, file.size);
        if (!legacy.ok) {
          if (!primaryExtraction) {
            return legacy.error;
          }
          intakeTelemetry("intake_fallback_text", { ok: false, had_ai_extraction: true });
        } else {
          legacyMeta = legacy.data;
          plainText = legacy.data.plainText;
          intakeTelemetry("intake_fallback_text", { ok: true, had_ai_extraction: Boolean(primaryExtraction) });
        }
      }
    }

    let vehicleId = vehicleIdRaw;
    let createdDraft = false;

    if (!vehicleId) {
      const preferredDraftVin =
        formVinRaw.length === 17 &&
        !isProvisionalIntakeVin(formVinRaw) &&
        isValidVinCheckDigit(formVinRaw) &&
        (await isVinUnique(formVinRaw))
          ? formVinRaw
          : null;
      const v = await createPlaceholderDraftVehicle(organizationId, { id: user.id, role: user.role }, preferredDraftVin);
      vehicleId = v.id;
      createdDraft = true;
    } else {
      const existing = await db.vehicle.findFirst({
        where: { id: vehicleId, organizationId },
        select: { id: true, vehicleStatus: true },
      });
      if (!existing) {
        return { ok: false, code: "VEHICLE_NOT_FOUND", message: "Vehicle not found or access denied." };
      }
      if (LOCKED.includes(existing.vehicleStatus)) {
        return { ok: false, code: "VEHICLE_LOCKED", message: "This vehicle cannot be edited in its current status." };
      }
    }

    let storageKey: string;
    try {
      storageKey = await saveFile(file, { isPublic: false });
    } catch {
      if (createdDraft) {
        await db.vehicle.delete({ where: { id: vehicleId } }).catch(() => {});
      }
      return { ok: false, code: "UPLOAD_FAILED", message: "Could not store the file. Please try again." };
    }

    const doc = await db.vehicleDocument.create({
      data: {
        vehicleId,
        documentLabel: "Smart intake",
        fileUrl: storageKey,
      },
    });

    type Ranked = ReturnType<typeof collectRankedVinCandidates>[number];
    let ranked: Ranked[] = [];
    let requiresOcrVinReview = false;
    let usedLegacyImagePath = false;

    if (primaryExtraction?.vin && primaryExtraction.vin.length === 17) {
      const v = primaryExtraction.vin;
      const checksumOk = isValidVinCheckDigit(v);
      const vinConf = primaryExtraction.confidence.vin ?? primaryExtraction.confidence.overall;
      const autoAccept =
        checksumOk &&
        vinConf >= INTAKE_VIN_AUTO_ACCEPT_CONFIDENCE &&
        primaryExtraction.confidence.overall >= INTAKE_OVERALL_MIN_FOR_AUTO_VIN;

      ranked = [{ vin: v, ocrSubstitutionCount: 0, firstIndex: 0 }];
      if (!autoAccept) {
        requiresOcrVinReview = true;
        intakeTelemetry("intake_vin", {
          outcome: "ai_review_required",
          checksum_ok: checksumOk,
          candidate_count: 1,
        });
      } else {
        intakeTelemetry("intake_vin", { outcome: "single", candidate_count: 1, source: "ai_primary" });
      }
    } else if (legacyMeta) {
      usedLegacyImagePath = legacyMeta.extractionKind === "image_ocr";
      ranked = collectRankedVinCandidates(plainText);
    } else {
      ranked = [];
    }

    if (ranked.length === 0) {
      intakeTelemetry("intake_vin", { outcome: "none", candidate_count: 0 });
      revalidatePath("/admin/inventory");
      revalidatePath(`/admin/inventory/${vehicleId}/edit`);
      return {
        ok: false,
        code: "NO_VIN_FOUND",
        message:
          "No valid 17-character VIN was found in this document. Enter the VIN manually and use Re-run decode, or try a clearer scan.",
        vehicleId,
        createdDraft,
      };
    }

    let extractedVin: string;
    let ocrVinCandidates: string[] | undefined;

    if (usedLegacyImagePath) {
      requiresOcrVinReview = true;
      ocrVinCandidates = ranked.slice(0, 3).map((r) => r.vin);
      extractedVin = ocrVinCandidates[0]!;
      intakeTelemetry("intake_vin", {
        outcome: "ocr_review_required",
        source: "image_ocr_fallback",
        candidate_count: ocrVinCandidates.length,
      });
    } else if (requiresOcrVinReview && primaryExtraction?.vin) {
      ocrVinCandidates = ranked.slice(0, 3).map((r) => r.vin);
      extractedVin = ocrVinCandidates[0]!;
    } else if (!requiresOcrVinReview && primaryExtraction?.vin) {
      extractedVin = primaryExtraction.vin;
    } else {
      const minEdits = ranked[0]!.ocrSubstitutionCount;
      const tier = ranked.filter((r) => r.ocrSubstitutionCount === minEdits);
      if (tier.length > 1) {
        intakeTelemetry("intake_vin", {
          outcome: "ambiguous",
          candidate_count: tier.length,
        });
        revalidatePath("/admin/inventory");
        revalidatePath(`/admin/inventory/${vehicleId}/edit`);
        return {
          ok: false,
          code: "AMBIGUOUS_VIN",
          message:
            "Multiple VINs were found in this document. Remove extra pages or enter the correct VIN manually.",
          vehicleId,
          createdDraft,
          ambiguousCandidates: tier.map((t) => t.vin).slice(0, 12),
        };
      }
      extractedVin = tier[0]!.vin;
      if (minEdits > 0) {
        requiresOcrVinReview = true;
        ocrVinCandidates = ranked.slice(0, 3).map((r) => r.vin);
        intakeTelemetry("intake_vin", {
          outcome: "ocr_review_required",
          source: "pdf_repaired_fallback",
          candidate_count: ocrVinCandidates.length,
        });
      } else {
        intakeTelemetry("intake_vin", { outcome: "single", candidate_count: 1, source: "text_fallback" });
      }
    }

    const requiresVinConfirmation =
      !requiresOcrVinReview &&
      formVinRaw.length === 17 &&
      !isProvisionalIntakeVin(formVinRaw) &&
      formVinRaw !== extractedVin;

    let decoded: Awaited<ReturnType<typeof decodeVin>> = null;
    let decodeFailed = false;
    if (!requiresOcrVinReview) {
      try {
        decoded = await decodeVin(extractedVin);
        if (!decoded) decodeFailed = true;
      } catch {
        decodeFailed = true;
      }
      intakeTelemetry("intake_decode", { ok: !decodeFailed && decoded != null });
    } else {
      decodeFailed = true;
      intakeTelemetry("intake_decode", { ok: false, deferred_review: true });
    }

    let aiSuggestions: VehicleIntakeAiSuggestions | null = null;
    let aiMeta: VehicleIntakeAiMeta;

    const metaPrimaryOff = primaryAiIntakeDisabled ? ({ primaryAiIntakeDisabled: true } as const) : {};

    if (!hasOpenAiKey) {
      aiMeta = { status: "skipped", reason: "no_api_key" };
      intakeTelemetry("intake_openai", { outcome: "skipped_no_key" });
    } else if (primaryExtraction) {
      const base = mapVehicleIntakeExtractionToSuggestions(primaryExtraction);
      const enrichmentDoc = buildEnrichmentDocumentPlainText(plainText, pdfPlainTextForFallback);
      const primaryBlock = buildPrimaryEnrichmentBlock(primaryExtraction);
      let secondarySuggestions: VehicleIntakeAiSuggestions | null = null;
      try {
        secondarySuggestions = await runIntakeEnrichmentSecondPass(enrichmentDoc, primaryBlock, decoded);
      } catch {
        secondarySuggestions = null;
      }
      const secondary = Boolean(secondarySuggestions);
      if (enrichmentDoc.trim().length > 0 || primaryBlock.trim().length > 0) {
        intakeTelemetry("intake_enrichment_second_pass", {
          ok: secondary,
          had_document_text: enrichmentDoc.trim().length > 0,
          had_primary_block: primaryBlock.trim().length > 0,
        });
      }
      aiSuggestions = mergeIntakeAiSuggestions(base, secondarySuggestions);
      aiMeta = {
        status: "applied",
        extractionInput: extractionInputKind ?? undefined,
        secondarySuggestions: secondary,
      };
      intakeTelemetry("intake_openai", { outcome: "extraction_mapped", secondary });
    } else {
      try {
        const enrichmentDoc = buildEnrichmentDocumentPlainText(plainText, pdfPlainTextForFallback);
        const s = await runIntakeEnrichmentSecondPass(enrichmentDoc, "", decoded);
        if (enrichmentDoc.trim().length > 0) {
          intakeTelemetry("intake_enrichment_second_pass", {
            ok: Boolean(s),
            had_document_text: true,
            had_primary_block: false,
          });
        }
        if (s) {
          aiSuggestions = s;
          aiMeta = {
            status: "applied",
            ...metaPrimaryOff,
          };
          intakeTelemetry("intake_openai", { outcome: "success" });
        } else {
          aiMeta = {
            status: "skipped",
            reason: "extraction_unusable",
            message: "Model returned no usable structured data.",
            ...metaPrimaryOff,
          };
          intakeTelemetry("intake_openai", { outcome: "empty_response" });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const timedOut = msg.toLowerCase().includes("timed out");
        aiMeta = { status: "skipped", reason: "openai_error", message: msg, ...metaPrimaryOff };
        intakeTelemetry("intake_openai", {
          outcome: timedOut ? "timeout" : "error",
        });
      }
    }

    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/inventory/${vehicleId}/edit`);

    intakeTelemetry("intake_complete", {
      ok: true,
      created_draft: createdDraft,
      requires_vin_confirmation: requiresVinConfirmation,
      requires_ocr_vin_review: requiresOcrVinReview,
    });

    return {
      ok: true,
      vehicleId,
      createdDraft,
      extractedVin,
      decoded,
      decodeFailed,
      documentId: doc.id,
      requiresVinConfirmation,
      requiresOcrVinReview,
      ocrVinCandidates,
      aiSuggestions,
      aiMeta,
    };
  } catch (e) {
    console.error("vehicle-intake:", e);
    intakeTelemetry("intake_fatal", { ok: false });
    return {
      ok: false,
      code: "UPLOAD_FAILED",
      message: "Something went wrong. Please try again.",
    };
  }
}
