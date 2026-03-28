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
import { fetchIntakeFieldSuggestionsFromOpenAI } from "@/lib/openai-intake-suggestions";
import type { VehicleIntakeAiMeta, VehicleIntakeAiSuggestions } from "@/types/vehicle-intake-ai";
import { intakeTelemetry } from "@/lib/intake-telemetry";
import {
  INTAKE_PLACEHOLDER_MAKE,
  INTAKE_PLACEHOLDER_MODEL,
  INTAKE_PLACEHOLDER_PRICE,
} from "@/lib/intake-draft-placeholders";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);

const PDF_TEXT_MS = 25_000;
const IMAGE_OCR_MS = 65_000;

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
       * Image/screenshot OCR: never auto-apply VIN/decode until user confirms a candidate (see ocrVinCandidates).
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

/**
 * Phase 1: upload a single PDF/JPEG/PNG, extract VIN from text/OCR, optionally create a draft vehicle,
 * attach file as VehicleDocument, return decode metadata for client-side form merge (same rules as manual decode).
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

    let plainText: string;
    const extractionKind = mime === "application/pdf" ? "pdf_text" : "image_ocr";
    let imageOcrMeta:
      | {
          image_width?: number | null;
          image_height?: number | null;
          image_megapixels?: number | null;
          ocr_pass?: number | null;
          ocr_text_length?: number | null;
          ocr_duration_ms?: number | null;
        }
      | undefined;
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
        length_bucket: textLengthBucket(plainText.length),
        ...(extractionKind === "image_ocr" ? imageOcrMeta : {}),
      });
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
        extraction_route: extractionRoute,
        mime: mime.slice(0, 128),
        file_size_bytes: file.size,
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
          file_size_bytes: file.size,
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
          code: "PROCESS_TIMEOUT",
          message: "Processing took too long. Try a smaller file or a PDF with selectable text.",
        };
      }
      return {
        ok: false,
        code: "UPLOAD_FAILED",
        message: "We could not read text from this file. Try another scan or enter the VIN manually.",
      };
    }

    const ranked = collectRankedVinCandidates(plainText);

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

    const isImageOcr = extractionKind === "image_ocr";
    let extractedVin: string;
    let requiresOcrVinReview = false;
    let ocrVinCandidates: string[] | undefined;

    if (isImageOcr) {
      requiresOcrVinReview = true;
      ocrVinCandidates = ranked.slice(0, 3).map((r) => r.vin);
      extractedVin = ocrVinCandidates[0]!;
      intakeTelemetry("intake_vin", {
        outcome: "ocr_review_required",
        source: "image_ocr",
        candidate_count: ocrVinCandidates.length,
      });
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
          source: "pdf_repaired",
          candidate_count: ocrVinCandidates.length,
        });
      } else {
        intakeTelemetry("intake_vin", { outcome: "single", candidate_count: 1 });
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
      intakeTelemetry("intake_decode", { ok: false, deferred_ocr_review: true });
    }

    let aiSuggestions: VehicleIntakeAiSuggestions | null = null;
    let aiMeta: VehicleIntakeAiMeta;

    if (!process.env.OPENAI_API_KEY?.trim()) {
      aiMeta = { status: "skipped", reason: "no_api_key" };
      intakeTelemetry("intake_openai", { outcome: "skipped_no_key" });
    } else {
      try {
        const s = await fetchIntakeFieldSuggestionsFromOpenAI(plainText, decoded);
        if (s) {
          aiSuggestions = s;
          aiMeta = { status: "applied" };
          intakeTelemetry("intake_openai", { outcome: "success" });
        } else {
          aiMeta = {
            status: "skipped",
            reason: "openai_error",
            message: "Model returned no usable structured data.",
          };
          intakeTelemetry("intake_openai", { outcome: "empty_response" });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const timedOut = msg.toLowerCase().includes("timed out");
        aiMeta = { status: "skipped", reason: "openai_error", message: msg };
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
