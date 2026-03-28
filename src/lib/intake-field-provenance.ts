/**
 * Phase 2C: lightweight JSON provenance on Vehicle for support/debug (no normalized tables).
 */

import * as z from "zod";

export const INTAKE_PROVENANCE_VERSION = 1 as const;

export type IntakeFieldSource = "decoder" | "ai_auto" | "ai_accepted";

export type IntakeFieldProvenanceV1 = {
  v: typeof INTAKE_PROVENANCE_VERSION;
  documentId: string | null;
  fields: Record<string, { source: IntakeFieldSource; acceptedAt: string }>;
};

/** Field keys the client may record (defensive allowlist on server). */
export const INTAKE_PROVENANCE_FIELD_KEYS = new Set([
  "vin",
  "year",
  "make",
  "model",
  "trim",
  "drivetrain",
  "bodyStyle",
  "fuelType",
  "transmission",
  "doors",
  "batteryCapacityKWh",
  "highlights",
  "mileage",
  "exteriorColor",
  "interiorColor",
  "conditionNotes",
  "internalNotes",
  "titleStatus",
  "features",
]);

const fieldEntrySchema = z.object({
  source: z.enum(["decoder", "ai_auto", "ai_accepted"]),
  acceptedAt: z.string().min(10).max(40),
});

const provenanceSchema = z.object({
  v: z.literal(1),
  documentId: z.string().uuid().nullable().optional(),
  fields: z.record(z.string(), fieldEntrySchema),
});

export function parseIntakeFieldProvenanceJson(raw: unknown): IntakeFieldProvenanceV1 | null {
  if (raw == null) return null;
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  const parsed = provenanceSchema.safeParse(obj);
  if (!parsed.success) return null;
  const fields: IntakeFieldProvenanceV1["fields"] = {};
  for (const [k, v] of Object.entries(parsed.data.fields)) {
    if (INTAKE_PROVENANCE_FIELD_KEYS.has(k) && Object.keys(fields).length < 48) {
      fields[k] = v;
    }
  }
  return {
    v: 1,
    documentId: parsed.data.documentId ?? null,
    fields,
  };
}

export function emptyIntakeFieldProvenance(documentId: string | null = null): IntakeFieldProvenanceV1 {
  return { v: 1, documentId, fields: {} };
}

export function mergeIntakeProvenanceFields(
  prev: IntakeFieldProvenanceV1 | null,
  updates: Record<string, { source: IntakeFieldSource; acceptedAt: string }>,
  documentId?: string | null
): IntakeFieldProvenanceV1 {
  const base =
    prev && prev.v === 1
      ? prev
      : { v: 1 as const, documentId: documentId ?? null, fields: {} as IntakeFieldProvenanceV1["fields"] };
  const next: IntakeFieldProvenanceV1 = {
    v: 1,
    documentId: documentId !== undefined ? documentId : base.documentId,
    fields: { ...base.fields },
  };
  for (const [k, v] of Object.entries(updates)) {
    if (!INTAKE_PROVENANCE_FIELD_KEYS.has(k)) continue;
    if (Object.keys(next.fields).length >= 48 && !(k in next.fields)) continue;
    next.fields[k] = v;
  }
  return next;
}
