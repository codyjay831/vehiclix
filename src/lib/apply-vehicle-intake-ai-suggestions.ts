/**
 * Client-safe Phase 2A/2B/2C intake merge:
 * - "Auto" suggestions: transmission, drivetrain only (fill-empty).
 * - Deferred: mileage, colors, notes, title, AI highlights, AI features (explicit Accept in UI).
 * Decoder highlights (engine/HP) still applied via applyVinMetadataToVehicleForm only.
 */

import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import type { VinMetadata } from "@/lib/vin";
import type { TitleStatusHint, VehicleIntakeAiSuggestions } from "@/types/vehicle-intake-ai";

const isStringEmpty = (v: unknown) => v == null || v === undefined || !String(v ?? "").trim();
const isNumberEmpty = (v: unknown) =>
  v == null || v === undefined || v === "" || (typeof v === "number" && (Number.isNaN(v) || v === 0));

function isPlaceholderColor(v: unknown): boolean {
  const t = String(v ?? "").trim().toUpperCase();
  return t === "" || t === "TBD" || t === "N/A" || t === "UNKNOWN";
}

export type VehicleFormAiMergeShape = {
  mileage: number;
  exteriorColor: string;
  interiorColor: string;
  transmission?: string | null;
  drivetrain: string;
  conditionNotes?: string | null;
  internalNotes?: string | null;
  highlights?: string[];
  features?: string[];
};

/** AI suggestions awaiting explicit Accept (Phase 2B + 2C for list suggestions). */
export type DeferredAiReviewFields = {
  mileage?: number;
  exteriorColor?: string;
  interiorColor?: string;
  conditionNotes?: string;
  internalNotes?: string;
  title?: { statusHint: TitleStatusHint | null; notes: string | null };
  /** Phase 2C: AI-suggested highlight chips (not decoder-derived). */
  highlightSuggestions?: string[];
  featureSuggestions?: string[];
};

function buildDeferredReview<T extends VehicleFormAiMergeShape>(
  suggestions: VehicleIntakeAiSuggestions,
  getValues: UseFormGetValues<T>
): DeferredAiReviewFields {
  const out: DeferredAiReviewFields = {};

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

  const isEmptyDeferred = (d: DeferredAiReviewFields) =>
    d.mileage == null &&
    !d.exteriorColor &&
    !d.interiorColor &&
    !d.conditionNotes &&
    !d.internalNotes &&
    !d.title &&
    !(d.highlightSuggestions && d.highlightSuggestions.length > 0) &&
    !(d.featureSuggestions && d.featureSuggestions.length > 0);

  return isEmptyDeferred(out) ? {} : out;
}

/**
 * Apply only auto-merge AI fields (transmission, drivetrain). Phase 2C: no silent highlight/feature append.
 */
export function applyVehicleIntakeAiAutoSuggestions<T extends VehicleFormAiMergeShape>(
  setValue: UseFormSetValue<T>,
  getValues: UseFormGetValues<T>,
  suggestions: VehicleIntakeAiSuggestions,
  decodedSnapshot: VinMetadata | null
): string[] {
  const applied: string[] = [];

  if (
    !decodedSnapshot?.transmission &&
    suggestions.transmissionSuggestion &&
    isStringEmpty(getValues("transmission" as never))
  ) {
    setValue("transmission" as never, suggestions.transmissionSuggestion as never);
    applied.push("transmission");
  }

  if (
    !decodedSnapshot?.drivetrain &&
    suggestions.drivetrainSuggestion &&
    isStringEmpty(getValues("drivetrain" as never))
  ) {
    setValue("drivetrain" as never, suggestions.drivetrainSuggestion as never);
    applied.push("drivetrain");
  }

  return applied;
}

export function applyIntakeAiWithDeferredReview<T extends VehicleFormAiMergeShape>(
  setValue: UseFormSetValue<T>,
  getValues: UseFormGetValues<T>,
  suggestions: VehicleIntakeAiSuggestions,
  decodedSnapshot: VinMetadata | null
): { deferred: DeferredAiReviewFields; autoAppliedKeys: string[] } {
  const deferred = buildDeferredReview(suggestions, getValues);
  const autoAppliedKeys = applyVehicleIntakeAiAutoSuggestions(
    setValue,
    getValues,
    suggestions,
    decodedSnapshot
  );
  return { deferred, autoAppliedKeys };
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
  return false;
}
