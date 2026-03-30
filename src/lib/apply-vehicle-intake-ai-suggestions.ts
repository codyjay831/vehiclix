/**
 * Client-safe intake merge for document AI:
 * - Identity fields auto-apply from AI when NHTSA decode fails and confidence is high enough.
 * - Lower-confidence identity fields remain deferred for explicit Accept.
 * - Deferred review: mileage, colors, notes, title hints, highlight/feature suggestions (fill-empty rules).
 */

import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import type { TitleStatusHint, VehicleIntakeAiSuggestions } from "@/types/vehicle-intake-ai";
import {
  INTAKE_CORE_FIELD_SUGGEST_CONFIDENCE,
  INTAKE_AI_IDENTITY_AUTO_APPLY_CONFIDENCE,
} from "@/lib/intake-ai-confidence";

const isStringEmpty = (v: unknown) => v == null || v === undefined || !String(v ?? "").trim();
const isNumberEmpty = (v: unknown) =>
  v == null || v === undefined || v === "" || (typeof v === "number" && (Number.isNaN(v) || v === 0));

function isPlaceholderColor(v: unknown): boolean {
  const t = String(v ?? "").trim().toUpperCase();
  return t === "" || t === "TBD" || t === "N/A" || t === "UNKNOWN";
}

export type VehicleFormAiMergeShape = {
  mileage: number;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  exteriorColor: string;
  interiorColor: string;
  conditionNotes?: string | null;
  internalNotes?: string | null;
  highlights?: string[];
  features?: string[];
};

/** AI suggestions awaiting explicit Accept (never applied silently). */
export type DeferredAiReviewFields = {
  mileage?: number;
  exteriorColor?: string;
  interiorColor?: string;
  conditionNotes?: string;
  internalNotes?: string;
  title?: { statusHint: TitleStatusHint | null; notes: string | null };
  /** AI-suggested highlight chips (not decoder-derived). */
  highlightSuggestions?: string[];
  featureSuggestions?: string[];
  /** When VIN decode failed; each needs Accept (confidence-gated at build time). */
  suggestedIdentityYear?: number;
  suggestedIdentityMake?: string;
  suggestedIdentityModel?: string;
  suggestedIdentityTrim?: string | null;
};

function normStr(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

/**
 * Auto-apply high-confidence AI identity fields directly into the form when NHTSA decode failed.
 * Fields below the auto-apply threshold but above the suggest threshold go to deferred review.
 * Returns the list of field keys that were auto-applied.
 */
function autoApplyAiIdentity<T extends VehicleFormAiMergeShape>(
  suggestions: VehicleIntakeAiSuggestions,
  setValue: UseFormSetValue<T>,
  getValues: UseFormGetValues<T>,
  out: DeferredAiReviewFields
): string[] {
  const autoMin = INTAKE_AI_IDENTITY_AUTO_APPLY_CONFIDENCE;
  const deferMin = INTAKE_CORE_FIELD_SUGGEST_CONFIDENCE;
  const applied: string[] = [];

  const sy = suggestions.suggestedYear;
  const syConf = suggestions.suggestedYearConfidence ?? 0;
  if (sy != null && Number(getValues("year" as never)) !== sy) {
    if (syConf >= autoMin) {
      setValue("year" as never, sy as never);
      applied.push("year");
    } else if (syConf >= deferMin) {
      out.suggestedIdentityYear = sy;
    }
  }

  const sm = suggestions.suggestedMake;
  const smConf = suggestions.suggestedMakeConfidence ?? 0;
  if (sm != null && normStr(getValues("make" as never)) !== normStr(sm)) {
    if (smConf >= autoMin) {
      setValue("make" as never, sm as never);
      applied.push("make");
    } else if (smConf >= deferMin) {
      out.suggestedIdentityMake = sm;
    }
  }

  const smod = suggestions.suggestedModel;
  const smodConf = suggestions.suggestedModelConfidence ?? 0;
  if (smod != null && normStr(getValues("model" as never)) !== normStr(smod)) {
    if (smodConf >= autoMin) {
      setValue("model" as never, smod as never);
      applied.push("model");
    } else if (smodConf >= deferMin) {
      out.suggestedIdentityModel = smod;
    }
  }

  const st = suggestions.suggestedTrim;
  const stConf = suggestions.suggestedTrimConfidence ?? 0;
  if (st != null && normStr(getValues("trim" as never)) !== normStr(st)) {
    if (stConf >= autoMin) {
      setValue("trim" as never, st as never);
      applied.push("trim");
    } else if (stConf >= deferMin) {
      out.suggestedIdentityTrim = st;
    }
  }

  return applied;
}

/** Legacy path: defer all identity fields for explicit Accept (used when auto-apply is off). */
function appendDecodeFailedIdentity<T extends VehicleFormAiMergeShape>(
  suggestions: VehicleIntakeAiSuggestions,
  getValues: UseFormGetValues<T>,
  out: DeferredAiReviewFields
): void {
  const min = INTAKE_CORE_FIELD_SUGGEST_CONFIDENCE;
  const sy = suggestions.suggestedYear;
  if (sy != null && (suggestions.suggestedYearConfidence ?? 0) >= min) {
    const cur = getValues("year" as never);
    if (Number(cur) !== sy) {
      out.suggestedIdentityYear = sy;
    }
  }
  const sm = suggestions.suggestedMake;
  if (sm != null && (suggestions.suggestedMakeConfidence ?? 0) >= min) {
    if (normStr(getValues("make" as never)) !== normStr(sm)) {
      out.suggestedIdentityMake = sm;
    }
  }
  const smod = suggestions.suggestedModel;
  if (smod != null && (suggestions.suggestedModelConfidence ?? 0) >= min) {
    if (normStr(getValues("model" as never)) !== normStr(smod)) {
      out.suggestedIdentityModel = smod;
    }
  }
  const st = suggestions.suggestedTrim;
  if (st != null && (suggestions.suggestedTrimConfidence ?? 0) >= min) {
    if (normStr(getValues("trim" as never)) !== normStr(st)) {
      out.suggestedIdentityTrim = st;
    }
  }
}

function buildDeferredReview<T extends VehicleFormAiMergeShape>(
  suggestions: VehicleIntakeAiSuggestions,
  setValue: UseFormSetValue<T>,
  getValues: UseFormGetValues<T>,
  opts?: { decodeFailed?: boolean }
): { deferred: DeferredAiReviewFields; aiAutoAppliedIdentity: string[] } {
  const out: DeferredAiReviewFields = {};
  let aiAutoAppliedIdentity: string[] = [];

  if (suggestions.mileage != null && isNumberEmpty(getValues("mileage" as never))) {
    out.mileage = suggestions.mileage;
  }
  if (suggestions.exteriorColor && isPlaceholderColor(getValues("exteriorColor" as never))) {
    out.exteriorColor = suggestions.exteriorColor;
  }
  if (suggestions.interiorColor && isPlaceholderColor(getValues("interiorColor" as never))) {
    out.interiorColor = suggestions.interiorColor;
  }
  if (suggestions.conditionNotesDraft && isStringEmpty(getValues("conditionNotes" as never))) {
    out.conditionNotes = suggestions.conditionNotesDraft;
  }
  if (suggestions.internalNotesDraft && isStringEmpty(getValues("internalNotes" as never))) {
    out.internalNotes = suggestions.internalNotesDraft;
  }
  if (suggestions.titleStatusHint || (suggestions.titleNotes && suggestions.titleNotes.trim())) {
    out.title = {
      statusHint: suggestions.titleStatusHint,
      notes: suggestions.titleNotes,
    };
  }

  const currentHighlights = (getValues("highlights" as never) as unknown as string[] | undefined) || [];
  const hlSuggested = suggestions.highlightSuggestions
    .map((h) => h.trim().slice(0, 80))
    .filter(Boolean)
    .filter((h) => !currentHighlights.includes(h));
  if (hlSuggested.length > 0) {
    out.highlightSuggestions = hlSuggested.slice(0, 8);
  }

  const currentFeatures = (getValues("features" as never) as unknown as string[] | undefined) || [];
  const ftSuggested = suggestions.featureSuggestions
    .map((f) => f.trim().slice(0, 120))
    .filter(Boolean)
    .filter((f) => !currentFeatures.includes(f));
  if (ftSuggested.length > 0) {
    out.featureSuggestions = ftSuggested.slice(0, 12);
  }

  if (opts?.decodeFailed) {
    aiAutoAppliedIdentity = autoApplyAiIdentity(suggestions, setValue, getValues, out);
  }

  const isEmptyDeferred = (d: DeferredAiReviewFields) =>
    d.mileage == null &&
    !d.exteriorColor &&
    !d.interiorColor &&
    !d.conditionNotes &&
    !d.internalNotes &&
    !d.title &&
    !(d.highlightSuggestions && d.highlightSuggestions.length > 0) &&
    !(d.featureSuggestions && d.featureSuggestions.length > 0) &&
    d.suggestedIdentityYear == null &&
    !d.suggestedIdentityMake &&
    !d.suggestedIdentityModel &&
    (d.suggestedIdentityTrim == null || d.suggestedIdentityTrim === "");

  return {
    deferred: isEmptyDeferred(out) ? {} : out,
    aiAutoAppliedIdentity,
  };
}

/**
 * Builds deferred AI review items. When NHTSA decode fails, high-confidence
 * identity fields are auto-applied directly into the form via setValue;
 * lower-confidence fields remain deferred for explicit Accept.
 */
export function applyIntakeAiWithDeferredReview<T extends VehicleFormAiMergeShape>(
  setValue: UseFormSetValue<T>,
  getValues: UseFormGetValues<T>,
  suggestions: VehicleIntakeAiSuggestions | null,
  opts?: { decodeFailed?: boolean }
): { deferred: DeferredAiReviewFields; aiAutoAppliedIdentity: string[] } {
  if (!suggestions) {
    return { deferred: {}, aiAutoAppliedIdentity: [] };
  }
  return buildDeferredReview(suggestions, setValue, getValues, opts);
}

export function deferredAiReviewHasPending(d: DeferredAiReviewFields | null): boolean {
  if (!d || typeof d !== "object") return false;
  if (d.mileage != null) return true;
  if (d.exteriorColor) return true;
  if (d.interiorColor) return true;
  if (d.conditionNotes) return true;
  if (d.internalNotes) return true;
  if (d.title && (d.title.statusHint || (d.title.notes && d.title.notes.trim()))) return true;
  if (d.highlightSuggestions && d.highlightSuggestions.length > 0) return true;
  if (d.featureSuggestions && d.featureSuggestions.length > 0) return true;
  if (d.suggestedIdentityYear != null) return true;
  if (d.suggestedIdentityMake) return true;
  if (d.suggestedIdentityModel) return true;
  if (d.suggestedIdentityTrim != null && String(d.suggestedIdentityTrim).trim()) return true;
  return false;
}
