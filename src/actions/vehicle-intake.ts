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
import { extractTextFromImageBuffer } from "@/lib/vin-extraction-server";
import { isProvisionalIntakeVin, randomProvisionalVin } from "@/lib/vehicle-intake-helpers";
import { isVinUnique } from "@/actions/inventory";
import { fetchIntakeFieldSuggestionsFromOpenAI } from "@/lib/openai-intake-suggestions";
import {
  extractVehicleIntakeWithOpenAI,
  mapVehicleIntakeExtractionToSuggestions,
} from "@/lib/openai-intake-extraction";
import { extractVinOnlyWithOpenAI, type VinOnlyExtractionResult } from "@/lib/openai-vin-only-extraction";
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

const AI_EXTRACTION_MS = 62_000;

const LOCKED: VehicleStatus[] = ["RESERVED", "UNDER_CONTRACT", "SOLD"];

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
       * Uncertain VIN from AI: never auto-apply VIN/decode until user confirms (see ocrVinCandidates).
       * decode is null until client confirms and runs decodeVin locally.
       */
      requiresOcrVinReview?: boolean;
      ocrVinCandidates?: string[];
      ambiguousCandidates?: undefined;
      /** Phase 2A: OpenAI field suggestions (null if skipped or failed). */
      aiSuggestions: VehicleIntakeAiSuggestions | null;
      aiMeta: VehicleIntakeAiMeta;
      /** True when AI extracted useful fields but no VIN was found in the document. */
      vinNotExtracted?: boolean;
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

/**
 * Upload a single PDF/JPEG/PNG: AI extraction only (PDFs: OpenAI file input; images: vision).
 * Manual VIN entry is the only fallback when extraction is insufficient.
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

    const size = file.size;
    const mime = (file.type || "").toLowerCase();
    intakeTelemetry("intake_request_start", { mime, size });

    const vehicleIdRaw = (formData.get("vehicleId") as string | null)?.trim() || "";
    const formVinRaw = (formData.get("formVin") as string | null)?.trim().toUpperCase() || "";

    if (!ALLOWED_MIME.has(mime)) {
      intakeTelemetry("intake_upload", { ok: false, reason: "unsupported_mime", mime });
      return {
        ok: false,
        code: "UNSUPPORTED_FILE",
        message: "Only PDF, JPG/JPEG, and PNG files are supported.",
      };
    }

    if (size > MAX_FILE_SIZE_BYTES) {
      intakeTelemetry("intake_upload", { ok: false, reason: "file_too_large", size });
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
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const intakeModel = process.env.OPENAI_INTAKE_MODEL?.trim() || "gpt-4o";

    let vehicleId = vehicleIdRaw;
    let createdDraft = false;
    let draftVin: string | null = null;

    // Phase 0: Resolve vehicle context immediately
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
      draftVin = v.vin;
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

    // Phase 1: Parallel extraction and storage
    let primaryExtraction: VehicleIntakeAiExtraction | null = null;
    let vinOnlyResult: VinOnlyExtractionResult | null = null;
    let extractionInputKind: "image" | "pdf" | null = null;
    let aiExtractionError: string | null = null;
    let localOcrError: string | null = null;
    let localVin: string | null = null;
    let localOcrText = "";
    let storageKey: string | null = null;
    let docId: string | null = null;

    const extractionTasks: Promise<void>[] = [];

    // Local OCR task (images) — disabled in production/Vercel where tesseract.js worker crashes
    const skipLocalOcr = Boolean(
      process.env.VERCEL || (process.env.NODE_ENV === "production" && !process.env.ENABLE_LOCAL_OCR)
    );

    if (mime.startsWith("image/") && !skipLocalOcr) {
      extractionTasks.push((async () => {
        try {
          intakeTelemetry("intake_local_ocr_start", { mime });
          const ocrResult = await withTimeout(
            extractTextFromImageBuffer(buffer),
            25_000,
            "Local OCR"
          );
          localOcrText = ocrResult.text;
          const candidates = collectRankedVinCandidates(localOcrText);
          if (candidates.length > 0) {
            localVin = candidates[0].vin;
            intakeTelemetry("intake_local_ocr_vin", {
              ok: true,
              candidateCount: candidates.length,
              bestVin: localVin.slice(0, 4) + "...",
            });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          localOcrError = msg;
          console.error("[intake] local ocr failed:", e);
        }
      })());
    } else if (mime.startsWith("image/") && skipLocalOcr) {
      intakeTelemetry("intake_local_ocr_skipped_production", { mime });
    }

    // Local text extraction task (PDFs — uses pdfjs-dist legacy build, no canvas/DOMMatrix needed)
    if (mime === "application/pdf") {
      extractionTasks.push((async () => {
        try {
          intakeTelemetry("intake_pdf_text_start", { size: buffer.length });
          const { extractTextFromPdfBuffer } = await import("@/lib/pdf-text-extraction");
          const text = await withTimeout(
            extractTextFromPdfBuffer(buffer),
            15_000,
            "PDF text extraction"
          );
          localOcrText = text || "";
          const candidates = collectRankedVinCandidates(localOcrText);
          if (candidates.length > 0) {
            localVin = candidates[0].vin;
            intakeTelemetry("intake_pdf_text_vin", {
              ok: true,
              candidateCount: candidates.length,
              bestVin: localVin.slice(0, 4) + "...",
            });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          localOcrError = msg;
          console.error("[intake] PDF text extraction failed:", e);
        }
      })());
    }

    // AI Extraction task (Parallel)
    if (hasOpenAiKey) {
      extractionTasks.push((async () => {
        try {
          intakeTelemetry("intake_ai_start", { model: intakeModel, mime });
          const bundle = await withTimeout(
            extractVehicleIntakeWithOpenAI({
              buffer,
              mime: mime as "application/pdf" | "image/jpeg" | "image/png",
              apiKeyOverride: apiKey,
            }),
            AI_EXTRACTION_MS,
            "AI intake extraction"
          );
          if (bundle) {
            primaryExtraction = bundle.extraction;
            extractionInputKind = bundle.inputKind;
            if (bundle.extractionError) {
              aiExtractionError = bundle.extractionError;
            }
            intakeTelemetry("intake_ai_primary", {
              ok: !!primaryExtraction,
              input: extractionInputKind,
              hasVin: !!primaryExtraction?.vin,
              error: bundle.extractionError ?? undefined,
            });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          aiExtractionError = msg;
          console.error("[intake] AI extraction task failed:", e);
        }
      })());

      // Dedicated VIN-only pass (Parallel)
      extractionTasks.push((async () => {
        try {
          intakeTelemetry("intake_vin_only_start", { model: intakeModel, mime });
          const res = await extractVinOnlyWithOpenAI({
            buffer,
            mime: mime as "application/pdf" | "image/jpeg" | "image/png",
            apiKeyOverride: apiKey,
          });
          vinOnlyResult = res;
          intakeTelemetry("intake_vin_only_complete", {
            ok: !!res,
            candidateCount: res?.candidates?.length ?? 0,
            hasBestGuess: !!res?.bestGuessVin,
          });
        } catch (e) {
          console.error("[intake] dedicated VIN pass failed:", e);
        }
      })());
    }

    // Storage task (Parallel)
    extractionTasks.push((async () => {
      try {
        const storableFile = new File([new Uint8Array(buffer)], file.name, { type: file.type });
        storageKey = await saveFile(storableFile, { isPublic: false });
        const doc = await db.vehicleDocument.create({
          data: {
            vehicleId,
            documentLabel: "Smart intake",
            fileUrl: storageKey,
          },
        });
        docId = doc.id;
        intakeTelemetry("intake_storage", { ok: true });
      } catch (e) {
        console.error("[intake] storage failed:", e);
      }
    })());

    // Wait for all critical Phase 1 tasks to complete (or fail gracefully)
    await Promise.allSettled(extractionTasks);

    if (!storageKey) {
      if (createdDraft) {
        await db.vehicle.delete({ where: { id: vehicleId } }).catch(() => {});
      }
      return { ok: false, code: "UPLOAD_FAILED", message: "Could not store the file. Please try again." };
    }

    const diagnosticParts: string[] = [];
    if (aiExtractionError) diagnosticParts.push(`AI: ${aiExtractionError}`);
    if (localOcrError) diagnosticParts.push(`OCR: ${localOcrError}`);
    const diagnosticSuffix = diagnosticParts.length > 0
      ? ` [${diagnosticParts.join(" | ")}]`
      : "";

    const noVinMessage = !hasOpenAiKey
      ? "AI extraction is not configured (OPENAI_API_KEY). Your file was saved — enter the VIN manually and use Re-run decode if needed."
      : `We couldn't extract enough vehicle info from this file. Upload a clearer image/document or enter the VIN manually.${diagnosticSuffix}`;

    // Phase 2: Resolve VIN
    const aiVinPrimary = (primaryExtraction as VehicleIntakeAiExtraction | null)?.vin;
    const vinOnlyResultLocal = vinOnlyResult as VinOnlyExtractionResult | null;
    const aiVinDedicated = vinOnlyResultLocal?.bestGuessVin;
    const candidatesFromOcr = collectRankedVinCandidates(localOcrText);
    const ocrVinBest = candidatesFromOcr.length > 0 ? candidatesFromOcr[0].vin : null;

    intakeTelemetry("intake_vin_resolution_inputs_v2", {
      aiVinPrimary: aiVinPrimary ? aiVinPrimary.slice(0, 4) + "..." : null,
      aiVinDedicated: aiVinDedicated ? aiVinDedicated.slice(0, 4) + "..." : null,
      ocrVinBest: ocrVinBest ? ocrVinBest.slice(0, 4) + "..." : null,
      ocrCandidateCount: candidatesFromOcr.length,
      aiCandidateCount: vinOnlyResultLocal?.candidates?.length ?? 0,
      skipLocalOcr,
    });

    // Rank all candidates to find the best possible match
    const allCandidates = new Set<string>();
    if (aiVinDedicated && !isProvisionalIntakeVin(aiVinDedicated)) allCandidates.add(aiVinDedicated);
    if (aiVinPrimary && !isProvisionalIntakeVin(aiVinPrimary)) allCandidates.add(aiVinPrimary);
    if (ocrVinBest && !isProvisionalIntakeVin(ocrVinBest)) allCandidates.add(ocrVinBest);
    
    vinOnlyResultLocal?.candidates.forEach((c: { vin: string }) => {
      if (!isProvisionalIntakeVin(c.vin)) allCandidates.add(c.vin);
    });
    candidatesFromOcr.forEach(c => {
      if (!isProvisionalIntakeVin(c.vin)) allCandidates.add(c.vin);
    });

    const uniqueCandidates = Array.from(allCandidates);
    const validChecksumCandidates = uniqueCandidates.filter(v => isValidVinCheckDigit(v));

    let extractedVinFinal: string | null = null;
    let vinSource: "ai_dedicated" | "ai_primary" | "local" | "none" = "none";
    let autoAccept = false;

    // 1. Check for high-confidence auto-accept from dedicated pass
    if (aiVinDedicated && isValidVinCheckDigit(aiVinDedicated)) {
      const dedicatedConf = vinOnlyResultLocal?.candidates.find((c: { vin: string }) => c.vin === aiVinDedicated)?.confidence ?? 0;
      if (dedicatedConf >= INTAKE_VIN_AUTO_ACCEPT_CONFIDENCE) {
        extractedVinFinal = aiVinDedicated;
        vinSource = "ai_dedicated";
        autoAccept = true;
      }
    }

    // 2. Fallback to primary extraction auto-accept if dedicated failed
    if (!autoAccept && aiVinPrimary && isValidVinCheckDigit(aiVinPrimary)) {
      const primaryConf = (primaryExtraction as VehicleIntakeAiExtraction | null)?.confidence.vin ?? 0;
      const overallConf = (primaryExtraction as VehicleIntakeAiExtraction | null)?.confidence.overall ?? 0;
      if (primaryConf >= INTAKE_VIN_AUTO_ACCEPT_CONFIDENCE && overallConf >= INTAKE_OVERALL_MIN_FOR_AUTO_VIN) {
        extractedVinFinal = aiVinPrimary;
        vinSource = "ai_primary";
        autoAccept = true;
      }
    }

    // 3. If no auto-accept, pick the "best" for extraction path but mark as review required
    if (!autoAccept) {
      extractedVinFinal = aiVinDedicated || aiVinPrimary || ocrVinBest || (validChecksumCandidates.length > 0 ? validChecksumCandidates[0] : (uniqueCandidates.length > 0 ? uniqueCandidates[0] : null));
      if (extractedVinFinal === aiVinDedicated) vinSource = "ai_dedicated";
      else if (extractedVinFinal === aiVinPrimary) vinSource = "ai_primary";
      else if (extractedVinFinal === ocrVinBest) vinSource = "local";
      else if (extractedVinFinal) vinSource = "ai_dedicated"; // assume from list
    }

    if (!extractedVinFinal || extractedVinFinal.length !== 17 || isProvisionalIntakeVin(extractedVinFinal)) {
      // When AI extracted useful fields but no VIN: succeed with suggestions so they aren't lost.
      const aiExt = primaryExtraction as VehicleIntakeAiExtraction | null;
      if (aiExt) {
        const fallbackVin =
          formVinRaw.length === 17 && !isProvisionalIntakeVin(formVinRaw)
            ? formVinRaw
            : "";

        const base = mapVehicleIntakeExtractionToSuggestions(aiExt);
        const enrichmentDoc = localOcrText;
        const primaryBlock = buildPrimaryEnrichmentBlock(aiExt);
        let secondarySuggestions: VehicleIntakeAiSuggestions | null = null;
        try {
          secondarySuggestions = await runIntakeEnrichmentSecondPass(enrichmentDoc, primaryBlock, null);
        } catch {
          secondarySuggestions = null;
        }
        const aiSuggestions = mergeIntakeAiSuggestions(base, secondarySuggestions);
        const aiMeta: VehicleIntakeAiMeta = {
          status: "applied",
          extractionInput: extractionInputKind ?? undefined,
          secondarySuggestions: Boolean(secondarySuggestions),
        };

        intakeTelemetry("intake_no_vin_ai_fallback_v2", {
          createdDraft,
          has_year: !!aiExt.year,
          has_make: !!aiExt.make,
          has_model: !!aiExt.model,
          hadAiCandidates: (vinOnlyResultLocal?.candidates?.length ?? 0) > 0,
        });

        revalidatePath("/admin/inventory");
        revalidatePath(`/admin/inventory/${vehicleId}/edit`);

        return {
          ok: true,
          vehicleId,
          createdDraft,
          extractedVin: fallbackVin,
          decoded: null,
          decodeFailed: true,
          documentId: docId ?? "",
          requiresVinConfirmation: false,
          requiresOcrVinReview: false,
          vinNotExtracted: true,
          aiSuggestions,
          aiMeta,
          // Surface candidates even if no "best" was promoted
          ocrVinCandidates: uniqueCandidates.length > 0 ? uniqueCandidates : undefined,
        };
      }

      intakeTelemetry("intake_failure_no_vin_v2", {
        hasAi: !!vinOnlyResultLocal || !!primaryExtraction,
        hasLocal: !!ocrVinBest,
        ocrTextLen: localOcrText.length,
        aiError: aiExtractionError ?? undefined,
        ocrError: localOcrError ?? undefined,
      });
      revalidatePath("/admin/inventory");
      revalidatePath(`/admin/inventory/${vehicleId}/edit`);

      return {
        ok: false,
        code: "NO_VIN_FOUND",
        message: noVinMessage,
        vehicleId,
        createdDraft,
      };
    }

    const v = extractedVinFinal;
    const checksumOk = isValidVinCheckDigit(v);

    let requiresOcrVinReview = !autoAccept;
    let ocrVinCandidates: string[] | undefined;

    if (requiresOcrVinReview) {
      // Deduplicate and prioritize candidates
      const prioritizedCandidates = new Set<string>();
      if (v) prioritizedCandidates.add(v);
      
      // Add all checksum-valid candidates first
      validChecksumCandidates.forEach(c => prioritizedCandidates.add(c));
      
      // Add dedicated pass candidates
      vinOnlyResultLocal?.candidates.forEach((c: { vin: string }) => prioritizedCandidates.add(c.vin));
      
      // Add remaining candidates
      uniqueCandidates.forEach(c => prioritizedCandidates.add(c));
      
      ocrVinCandidates = Array.from(prioritizedCandidates).filter(c => !isProvisionalIntakeVin(c));

      intakeTelemetry("intake_vin_v2", {
        outcome: "ai_review_required",
        checksum_ok: checksumOk,
        candidate_count: ocrVinCandidates.length,
        source: vinSource,
      });

      // If we cleared all candidates, treat it as "no VIN found" fallback
      if (ocrVinCandidates.length === 0) {
        requiresOcrVinReview = false;
      }
    } else {
      intakeTelemetry("intake_vin_v2", {
        outcome: "auto_accept",
        candidate_count: 1,
        source: vinSource,
      });
    }

    const requiresVinConfirmation =
      !requiresOcrVinReview &&
      formVinRaw.length === 17 &&
      !isProvisionalIntakeVin(formVinRaw) &&
      formVinRaw !== extractedVinFinal;

    let decoded: Awaited<ReturnType<typeof decodeVin>> = null;
    let decodeFailed = false;
    if (!requiresOcrVinReview) {
      try {
        decoded = await decodeVin(extractedVinFinal);
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

    // Use empty extraction if AI failed completely
    const base = primaryExtraction
      ? mapVehicleIntakeExtractionToSuggestions(primaryExtraction)
      : mapVehicleIntakeExtractionToSuggestions({
          vin: extractedVinFinal,
          year: null,
          make: null,
          model: null,
          trim: null,
          mileage: null,
          plate: null,
          titleStatus: null,
          confidence: {
            overall: 0,
            vin: 0,
            year: 0,
            make: 0,
            model: 0,
            trim: 0,
            mileage: 0,
            plate: 0,
            titleStatus: 0,
          },
          notes: localOcrText ? `Local OCR found VIN. Text length: ${localOcrText.length}` : (vinOnlyResultLocal ? `Dedicated VIN pass found candidates.` : null),
          rawTextSummary: vinOnlyResultLocal?.reasoning ?? null,
          sourceTypeGuess: "other",
        });

    const enrichmentDoc = localOcrText;
    const primaryBlock = primaryExtraction ? buildPrimaryEnrichmentBlock(primaryExtraction) : "";
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
    const aiMeta: VehicleIntakeAiMeta = {
      status: "applied",
      extractionInput: extractionInputKind ?? undefined,
      secondarySuggestions: secondary,
    };
    intakeTelemetry("intake_openai", { outcome: "extraction_mapped", secondary });

    revalidatePath("/admin/inventory");
    revalidatePath(`/admin/inventory/${vehicleId}/edit`);

    intakeTelemetry("intake_complete", {
      ok: true,
      created_draft: createdDraft,
      requires_vin_confirmation: requiresVinConfirmation,
      requires_ocr_vin_review: requiresOcrVinReview,
      vin_source: (primaryExtraction as VehicleIntakeAiExtraction | null)?.vin === v ? "ai" : "local",
    });

    return {
      ok: true,
      vehicleId,
      createdDraft,
      extractedVin: extractedVinFinal,
      decoded,
      decodeFailed,
      documentId: docId ?? "",
      requiresVinConfirmation,
      requiresOcrVinReview,
      ocrVinCandidates,
      aiSuggestions,
      aiMeta,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("vehicle-intake:", e);
    intakeTelemetry("intake_fatal", { ok: false, error: msg });
    return {
      ok: false,
      code: "UPLOAD_FAILED",
      message: "Something went wrong. Please try again.",
    };
  }
}
