"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Drivetrain,
  InventoryCondition,
  TitleStatus,
  VehicleStatus,
} from "@prisma/client";
import {
  DRIVETRAIN_LABELS,
  INVENTORY_CONDITION_LABELS,
  TITLE_STATUS_LABELS,
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createVehicleAction, isVinUnique, updateVehicleAction } from "@/actions/inventory";
import { cn } from "@/lib/utils";
import { Loader2, Plus, X, Upload, Save, Search, CheckCircle2, Star, Circle } from "lucide-react";
import { decodeVin, type VinMetadata } from "@/lib/vin";
import { applyVinMetadataToVehicleForm } from "@/lib/vehicle-vin-form-merge";
import {
  applyIntakeAiWithDeferredReview,
  deferredAiReviewHasPending,
  type DeferredAiReviewFields,
} from "@/lib/apply-vehicle-intake-ai-suggestions";
import {
  processVehicleIntakeDocumentAction,
  logIntakeReviewEventAction,
} from "@/actions/vehicle-intake";
import {
  mergeIntakeProvenanceFields,
  parseIntakeFieldProvenanceJson,
  type IntakeFieldProvenanceV1,
} from "@/lib/intake-field-provenance";
import { Badge } from "@/components/ui/badge";
import type { VehicleIntakeAiMeta, VehicleIntakeAiSuggestions } from "@/types/vehicle-intake-ai";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  computeIntakeStillNeededLabels,
  isProvisionalIntakeVin,
} from "@/lib/vehicle-intake-helpers";
import { isValidVinCheckDigit } from "@/lib/vin-extraction";
import {
  INTAKE_PLACEHOLDER_PRICE,
  isIntakePlaceholderPriceValue,
} from "@/lib/intake-draft-placeholders";

function initialFormListingPrice(
  initialData: { vehicleStatus?: string; intakeFieldProvenance?: unknown; price?: unknown } | undefined
): number | "" {
  if (!initialData) return "";
  const prov = parseIntakeFieldProvenanceJson(initialData.intakeFieldProvenance ?? null);
  const unset =
    initialData.vehicleStatus === "DRAFT" &&
    prov?.intakePlaceholderPrice === true &&
    isIntakePlaceholderPriceValue(Number(initialData.price));
  if (unset) return "";
  return Number(initialData.price);
}

interface VehicleFormValues {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  bodyStyle?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  doors?: number | null;
  mileage: number;
  drivetrain: Drivetrain;
  batteryRange?: number | null;
  batteryCapacityKWh?: number | null;
  batteryChemistry?: string | null;
  chargingStandard?: string | null;
  exteriorColor: string;
  interiorColor: string;
  condition: InventoryCondition;
  titleStatus: TitleStatus;
  conditionNotes?: string | null;
  price: number | "";
  description?: string | null;
  highlights?: string[];
  features?: string[];
  internalNotes?: string | null;
  photos?: any;
}

const VEHICLE_INTAKE_STORAGE_KEY = "vehiclix_vehicle_intake_v2";

/** Keeps RadioGroup controlled: always returns a string in the candidates list (never undefined). */
function resolveOcrVinRadioValue(p: { ocrVinCandidates: string[]; selectedVin: string }): string {
  const first = p.ocrVinCandidates[0] ?? "";
  return p.selectedVin && p.ocrVinCandidates.includes(p.selectedVin) ? p.selectedVin : first;
}

const REQUIRED_FIELD_NAMES = new Set([
  "vin", "year", "make", "model", "mileage", "drivetrain",
  "exteriorColor", "interiorColor", "condition", "titleStatus", "price",
]);
function requiredFieldErrorClass(fieldName: string, invalid: boolean): string {
  return invalid && REQUIRED_FIELD_NAMES.has(fieldName) ? "border-destructive ring-2 ring-destructive/20" : "";
}

const DECODER_SNAPSHOT_KEYS = [
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
] as const;

function snapshotDecoderSlice(values: VehicleFormValues): Record<string, unknown> {
  return {
    year: values.year,
    make: values.make,
    model: values.model,
    trim: values.trim,
    drivetrain: values.drivetrain,
    bodyStyle: values.bodyStyle,
    fuelType: values.fuelType,
    transmission: values.transmission,
    doors: values.doors,
    batteryCapacityKWh: values.batteryCapacityKWh,
    highlights: [...(values.highlights || [])],
  };
}

function diffDecoderFilledFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const keys: string[] = [];
  for (const k of DECODER_SNAPSHOT_KEYS) {
    if (k === "highlights") {
      if (JSON.stringify(before.highlights) !== JSON.stringify(after.highlights)) keys.push("highlights");
    } else if (before[k] !== after[k]) keys.push(k);
  }
  return keys;
}

const DECODER_FIELD_LABELS: Record<string, string> = {
  year: "Year",
  make: "Make",
  model: "Model",
  trim: "Trim",
  drivetrain: "Drivetrain",
  bodyStyle: "Body style",
  fuelType: "Fuel type",
  transmission: "Transmission",
  doors: "Doors",
  batteryCapacityKWh: "Battery (kWh)",
  highlights: "Highlights",
};

function humanizeDecoderSummaryKeys(keys: string[]): string {
  return keys.map((k) => DECODER_FIELD_LABELS[k] ?? k).join(", ");
}

/** Subtle hint when the model is less certain; omit when null or very high. */
function formatAiConfidence(conf: number | null | undefined): string | null {
  if (conf == null || Number.isNaN(conf)) return null;
  if (conf >= 0.95) return null;
  const pct = Math.round(Math.min(1, Math.max(0, conf)) * 100);
  return `Model confidence ~${pct}%`;
}

function intakeSummaryAiDescription(meta: VehicleIntakeAiMeta): string {
  if (meta.status === "skipped" && meta.reason === "no_api_key") {
    return "OPENAI_API_KEY is not set — intake used text/OCR fallback where possible. No AI suggestions for this upload.";
  }
  if (meta.status === "skipped" && meta.reason === "openai_error") {
    const pre = meta.primaryAiIntakeDisabled ? "Primary extraction is off; " : "";
    return `${pre}Suggestions failed (${meta.message || "request error"}). Intake still completed.`;
  }
  if (meta.status === "skipped" && meta.reason === "extraction_unusable") {
    if (meta.primaryAiIntakeDisabled) {
      return "Primary extraction is off (INTAKE_AI_PRIMARY=0); no usable text-based suggestions came back for this upload.";
    }
    return "AI returned no usable suggestions for this upload.";
  }
  if (meta.status === "skipped") {
    return "AI suggestions were skipped for this upload.";
  }
  const parts: string[] = [];
  if (meta.primaryAiIntakeDisabled) {
    parts.push("Fast primary extraction is off (INTAKE_AI_PRIMARY=0).");
  }
  if (meta.extractionInput === "image") {
    parts.push("Photos: the model reads the image for structured fields.");
  } else if (meta.extractionInput === "pdf_text") {
    parts.push("PDFs: text is extracted first, then interpreted — not full-page vision.");
  }
  parts.push("Tap Accept for each suggestion below; VIN and listing price follow the usual rules.");
  return parts.join(" ");
}

const vehicleSchema = z.object({
  vin: z.string().length(17, "VIN must be exactly 17 characters"),
  year: z.coerce.number().min(2010).max(new Date().getFullYear() + 1),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  trim: z.string().optional().nullable(),
  bodyStyle: z.string().optional().nullable(),
  fuelType: z.string().optional().nullable(),
  transmission: z.string().optional().nullable(),
  doors: z.coerce.number().min(2).max(5).optional().nullable(),
  mileage: z.coerce.number().min(0, "Mileage cannot be negative"),
  drivetrain: z.nativeEnum(Drivetrain),
  batteryRange: z.coerce.number().optional().nullable(),
  batteryCapacityKWh: z.coerce.number().min(0).max(500).optional().nullable(),
  batteryChemistry: z.string().optional().nullable(),
  chargingStandard: z.string().optional().nullable(),
  exteriorColor: z.string().min(1, "Exterior color is required"),
  interiorColor: z.string().min(1, "Interior color is required"),
  condition: z.nativeEnum(InventoryCondition),
  titleStatus: z.nativeEnum(TitleStatus),
  conditionNotes: z.string().max(2000).optional().nullable(),
  price: z.union([
    z.literal(""),
    z.coerce.number().min(1000, "Price must be at least $1,000"),
  ]),
  description: z.string().max(5000).optional().nullable(),
  highlights: z.array(z.string().max(80)).max(20).optional(),
  features: z.array(z.string()).optional(),
  internalNotes: z.string().max(5000).optional().nullable(),
  photos: z.any().optional(), // Handled manually with file input
});

interface VehicleFormProps {
  initialData?: any; // The full vehicle object if editing
  isEdit?: boolean;
}

export function VehicleForm({ initialData, isEdit = false }: VehicleFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDecoding, setIsDecoding] = React.useState(false);
  const [intakeBusy, setIntakeBusy] = React.useState(false);
  const [photos, setPhotos] = React.useState<File[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const intakeFileInputRef = React.useRef<HTMLInputElement>(null);
  const vinInputRef = React.useRef<HTMLInputElement | null>(null);
  const [pendingOcrVinReview, setPendingOcrVinReview] = React.useState<{
    ocrVinCandidates: string[];
    selectedVin: string;
    documentId?: string;
    aiSuggestions: VehicleIntakeAiSuggestions | null;
    aiMeta: VehicleIntakeAiMeta;
  } | null>(null);
  const [pendingVinIntake, setPendingVinIntake] = React.useState<{
    extractedVin: string;
    decoded: VinMetadata | null;
    decodeFailed: boolean;
    aiSuggestions: VehicleIntakeAiSuggestions | null;
    aiMeta: VehicleIntakeAiMeta;
    documentId?: string;
  } | null>(null);

  const intakeProvenanceRef = React.useRef<IntakeFieldProvenanceV1 | null>(
    parseIntakeFieldProvenanceJson(initialData?.intakeFieldProvenance ?? null)
  );
  const lastIntakeDocumentIdRef = React.useRef<string | null>(null);

  const [intakeAiAcceptedFields, setIntakeAiAcceptedFields] = React.useState<string[]>([]);
  const [decoderFilledFields, setDecoderFilledFields] = React.useState<string[]>([]);
  const [deferredAiReview, setDeferredAiReview] = React.useState<DeferredAiReviewFields | null>(null);
  const [lastIntakeSummary, setLastIntakeSummary] = React.useState<{
    decodeFailed: boolean;
    aiMeta: VehicleIntakeAiMeta;
    aiSuggestions: VehicleIntakeAiSuggestions | null;
    /** Decoder-filled keys from this intake merge only (for summary bucket). */
    intakeDecoderFilledKeys: string[];
  } | null>(null);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: initialData ? {
      ...(() => {
        const { intakeFieldProvenance: _omit, ...rest } = initialData;
        return rest;
      })(),
      price: initialFormListingPrice(initialData),
      batteryRange: initialData.batteryRangeEstimate,
      bodyStyle: initialData.bodyStyle ?? null,
      fuelType: initialData.fuelType ?? null,
      transmission: initialData.transmission ?? null,
      doors: initialData.doors ?? null,
      batteryCapacityKWh: initialData.batteryCapacityKWh ?? null,
      batteryChemistry: initialData.batteryChemistry ?? null,
      chargingStandard: initialData.chargingStandard ?? null,
      conditionNotes: initialData.conditionNotes ?? null,
    } : {
      highlights: [],
      features: [],
      price: "",
    },
  });

  const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({
    control: form.control,
    name: "highlights" as any,
  });

  const { fields: featureFields, append: appendFeature, remove: removeFeature } = useFieldArray({
    control: form.control,
    name: "features" as any,
  });

  const mergeIntakeIntoForm = React.useCallback(
    (payload: {
      extractedVin: string;
      decoded: VinMetadata | null;
      decodeFailed: boolean;
      aiSuggestions: VehicleIntakeAiSuggestions | null;
      aiMeta: VehicleIntakeAiMeta;
      documentId?: string;
    }) => {
      const beforeDecoder = snapshotDecoderSlice(form.getValues());
      form.setValue("vin", payload.extractedVin);
      if (payload.decoded) {
        applyVinMetadataToVehicleForm(form.setValue, form.getValues, payload.decoded);
      }
      const afterDecoder = snapshotDecoderSlice(form.getValues());
      const decoderKeys = diffDecoderFilledFields(beforeDecoder, afterDecoder);
      setDecoderFilledFields(decoderKeys);

      let deferred: DeferredAiReviewFields = {};
      if (payload.aiSuggestions) {
        const r = applyIntakeAiWithDeferredReview(form.getValues, payload.aiSuggestions, {
          decodeFailed: payload.decodeFailed,
        });
        deferred = r.deferred;
      }
      setIntakeAiAcceptedFields([]);
      setDeferredAiReview(deferredAiReviewHasPending(deferred) ? deferred : null);

      const docId = payload.documentId?.trim();
      if (docId) {
        lastIntakeDocumentIdRef.current = docId;
      }
      const now = new Date().toISOString();
      const decoderUpdates = Object.fromEntries(
        decoderKeys.map((k) => [k, { source: "decoder" as const, acceptedAt: now }])
      );
      intakeProvenanceRef.current = mergeIntakeProvenanceFields(
        intakeProvenanceRef.current,
        decoderUpdates,
        docId ?? undefined
      );
      setLastIntakeSummary({
        decodeFailed: payload.decodeFailed,
        aiMeta: payload.aiMeta,
        aiSuggestions: payload.aiSuggestions,
        intakeDecoderFilledKeys: decoderKeys,
      });

      const hasDeferred = deferredAiReviewHasPending(deferred);
      if (payload.decodeFailed) {
        toast.message(
          "VIN was set from your document, but NHTSA decode did not return data. Review any identity hints in the intake summary and tap Accept before saving — nothing is applied silently."
        );
      } else if (hasDeferred) {
        toast.success(
          "VIN decode applied. Review AI suggestions in the intake summary — accept or reject each before saving."
        );
      } else if (decoderKeys.length > 0) {
        toast.success("VIN decode filled empty fields from your document. Review before saving.");
      } else {
        toast.success("VIN and vehicle details were applied from your document. Review before saving.");
      }
    },
    [form]
  );

  const handleConfirmOcrVin = React.useCallback(async () => {
    const p = pendingOcrVinReview;
    if (!p || p.ocrVinCandidates.length === 0) return;
    const vin = resolveOcrVinRadioValue(p).trim().toUpperCase();
    if (vin.length !== 17 || !isValidVinCheckDigit(vin)) {
      toast.error("Choose a valid 17-character VIN or edit manually.");
      return;
    }
    setIsDecoding(true);
    try {
      let decoded: VinMetadata | null = null;
      try {
        decoded = await decodeVin(vin);
      } catch {
        decoded = null;
      }
      const decodeFailed = !decoded;
      const formVin = (form.getValues("vin") || "").trim().toUpperCase();
      const needsVinClashDialog =
        formVin.length === 17 &&
        !isProvisionalIntakeVin(formVin) &&
        formVin !== vin;

      const mergePayload = {
        extractedVin: vin,
        decoded,
        decodeFailed,
        aiSuggestions: p.aiSuggestions,
        aiMeta: p.aiMeta,
        documentId: p.documentId,
      };

      setPendingOcrVinReview(null);

      if (needsVinClashDialog) {
        setPendingVinIntake(mergePayload);
      } else {
        mergeIntakeIntoForm(mergePayload);
      }
    } finally {
      setIsDecoding(false);
    }
  }, [pendingOcrVinReview, form, mergeIntakeIntoForm]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(VEHICLE_INTAKE_STORAGE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(VEHICLE_INTAKE_STORAGE_KEY);
    try {
      const payload = JSON.parse(raw) as {
        extractedVin: string;
        decoded: VinMetadata | null;
        decodeFailed?: boolean;
        requiresVinConfirmation?: boolean;
        requiresOcrVinReview?: boolean;
        ocrVinCandidates?: string[];
        aiSuggestions?: VehicleIntakeAiSuggestions | null;
        aiMeta?: VehicleIntakeAiMeta;
        documentId?: string;
      };
      const aiMeta: VehicleIntakeAiMeta = payload.aiMeta ?? {
        status: "skipped",
        reason: "no_api_key",
      };
      const aiSuggestions = payload.aiSuggestions ?? null;
      if (payload.requiresOcrVinReview && payload.ocrVinCandidates?.length) {
        const cands = payload.ocrVinCandidates;
        const ext = (payload.extractedVin || "").trim().toUpperCase();
        const selectedVin = ext && cands.includes(ext) ? ext : cands[0]!;
        setPendingOcrVinReview({
          ocrVinCandidates: cands,
          selectedVin,
          documentId: payload.documentId,
          aiSuggestions,
          aiMeta,
        });
        return;
      }
      if (payload.requiresVinConfirmation) {
        setPendingVinIntake({
          extractedVin: payload.extractedVin,
          decoded: payload.decoded,
          decodeFailed: Boolean(payload.decodeFailed),
          aiSuggestions,
          aiMeta,
          documentId: payload.documentId,
        });
        return;
      }
      mergeIntakeIntoForm({
        extractedVin: payload.extractedVin,
        decoded: payload.decoded,
        decodeFailed: Boolean(payload.decodeFailed),
        aiSuggestions,
        aiMeta,
        documentId: payload.documentId,
      });
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once after redirect from intake; form API is stable
  }, []);

  const watched = form.watch([
    "vin", "year", "make", "model", "mileage", "drivetrain",
    "exteriorColor", "interiorColor", "condition", "titleStatus", "price",
    "description", "highlights",
  ]);
  const intakeStillNeededLabels =
    lastIntakeSummary != null
      ? computeIntakeStillNeededLabels({
          vin: watched[0] || "",
          make: String(watched[2] ?? ""),
          model: String(watched[3] ?? ""),
          mileage: Number(watched[4]),
          exteriorColor: String(watched[6] ?? ""),
          interiorColor: String(watched[7] ?? ""),
          price: watched[10] as number | "",
          decodeFailed: lastIntakeSummary.decodeFailed,
          isEdit,
          photosCount: photos.length,
        })
      : [];
  const yearNum = Number(watched[1]);
  const yearPlausible = !Number.isNaN(yearNum) && yearNum >= 1900 && yearNum <= new Date().getFullYear() + 1;
  const section1Complete = Boolean(
    watched[0]?.length === 17 &&
    yearPlausible &&
    String(watched[2] ?? "").trim() &&
    String(watched[3] ?? "").trim()
  );
  const section2Complete = Boolean(Number(watched[4]) >= 0 && watched[5]);
  const section3Complete = Boolean(
    String(watched[6] ?? "").trim() &&
    String(watched[7] ?? "").trim() &&
    watched[8] &&
    watched[9]
  );
  const section4Complete = Boolean(Number(watched[10]) >= 1000);
  const section5Complete = Boolean(
    String(watched[11] ?? "").trim() ||
    (Array.isArray(watched[12]) && watched[12].some((h: string) => String(h ?? "").trim()))
  );
  const section6Complete = isEdit || photos.length >= 1;

  const handleDecodeVin = async () => {
    const vin = form.getValues("vin");
    if (!vin || vin.length !== 17) {
      toast.error("Please enter a valid 17-character VIN first");
      return;
    }

    setIsDecoding(true);
    try {
      const beforeDecoder = snapshotDecoderSlice(form.getValues());
      const data = await decodeVin(vin);
      if (data) {
        applyVinMetadataToVehicleForm(form.setValue, form.getValues, data);
        const afterDecoder = snapshotDecoderSlice(form.getValues());
        const decoderKeys = diffDecoderFilledFields(beforeDecoder, afterDecoder);
        setDecoderFilledFields((prev) => [...new Set([...prev, ...decoderKeys])]);
        const now = new Date().toISOString();
        const decoderUpdates = Object.fromEntries(
          decoderKeys.map((k) => [k, { source: "decoder" as const, acceptedAt: now }])
        );
        intakeProvenanceRef.current = mergeIntakeProvenanceFields(
          intakeProvenanceRef.current,
          decoderUpdates,
          undefined
        );
        toast.success("Vehicle data populated from VIN");
      } else {
        toast.error("Could not decode VIN. Please enter details manually.");
      }
    } catch {
      toast.error("VIN API error. Please enter details manually.");
    } finally {
      setIsDecoding(false);
    }
  };

  const intakeFieldReviewClass = (field: string) => {
    const aiMarked = intakeAiAcceptedFields.includes(field);
    if (aiMarked) return "ring-2 ring-amber-400/60 border-amber-500/40";
    if (decoderFilledFields.includes(field)) return "ring-2 ring-sky-400/50 border-sky-500/35";
    return "";
  };

  const stripDeferredPartial = React.useCallback(
    (mutate: (d: DeferredAiReviewFields) => DeferredAiReviewFields) => {
      setDeferredAiReview((prev) => {
        if (!prev) return null;
        const next = mutate({ ...prev });
        return deferredAiReviewHasPending(next) ? next : null;
      });
    },
    []
  );

  const bumpAiAcceptedProvenance = (fieldKey: string) => {
    const now = new Date().toISOString();
    intakeProvenanceRef.current = mergeIntakeProvenanceFields(
      intakeProvenanceRef.current,
      { [fieldKey]: { source: "ai_accepted", acceptedAt: now } },
      undefined
    );
  };

  const acceptDeferredMileage = () => {
    const v = deferredAiReview?.mileage;
    if (v == null) return;
    form.setValue("mileage", v);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.mileage;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "mileage"])]);
    bumpAiAcceptedProvenance("mileage");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "mileage" });
  };
  const acceptDeferredExterior = () => {
    const v = deferredAiReview?.exteriorColor;
    if (!v) return;
    form.setValue("exteriorColor", v);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.exteriorColor;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "exteriorColor"])]);
    bumpAiAcceptedProvenance("exteriorColor");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "exteriorColor" });
  };
  const acceptDeferredInterior = () => {
    const v = deferredAiReview?.interiorColor;
    if (!v) return;
    form.setValue("interiorColor", v);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.interiorColor;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "interiorColor"])]);
    bumpAiAcceptedProvenance("interiorColor");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "interiorColor" });
  };
  const acceptDeferredConditionNotes = () => {
    const v = deferredAiReview?.conditionNotes;
    if (!v) return;
    form.setValue("conditionNotes", v);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.conditionNotes;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "conditionNotes"])]);
    bumpAiAcceptedProvenance("conditionNotes");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "conditionNotes" });
  };
  const acceptDeferredInternalNotes = () => {
    const v = deferredAiReview?.internalNotes;
    if (!v) return;
    form.setValue("internalNotes", v);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.internalNotes;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "internalNotes"])]);
    bumpAiAcceptedProvenance("internalNotes");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "internalNotes" });
  };
  const acceptDeferredTitle = () => {
    const t = deferredAiReview?.title;
    if (!t) return;
    const acceptedKeys: string[] = [];
    if (t.statusHint) {
      form.setValue("titleStatus", t.statusHint);
      bumpAiAcceptedProvenance("titleStatus");
      acceptedKeys.push("titleStatus");
    }
    const notes = t.notes?.trim();
    if (notes) {
      const cur = (form.getValues("internalNotes") || "").trim();
      const block = `Title document (AI suggestion): ${notes}`;
      form.setValue("internalNotes", cur ? `${cur}\n\n${block}` : block);
      bumpAiAcceptedProvenance("internalNotes");
      acceptedKeys.push("internalNotes");
    }
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "title" });
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.title;
      return n;
    });
    if (acceptedKeys.length > 0) {
      setIntakeAiAcceptedFields((p) => [...new Set([...p, ...acceptedKeys])]);
    }
  };

  const acceptDeferredHighlights = () => {
    const sug = deferredAiReview?.highlightSuggestions;
    if (!sug?.length) return;
    const cur = form.getValues("highlights") || [];
    const merged = [...cur];
    for (const h of sug) {
      if (!merged.includes(h)) merged.push(h);
    }
    form.setValue("highlights", merged);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.highlightSuggestions;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "highlights"])]);
    bumpAiAcceptedProvenance("highlights");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "highlights" });
  };

  const acceptDeferredFeatures = () => {
    const sug = deferredAiReview?.featureSuggestions;
    if (!sug?.length) return;
    const cur = form.getValues("features") || [];
    const merged = [...cur];
    for (const f of sug) {
      if (!merged.includes(f)) merged.push(f);
    }
    form.setValue("features", merged);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.featureSuggestions;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "features"])]);
    bumpAiAcceptedProvenance("features");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "features" });
  };

  const acceptDeferredIdentityYear = () => {
    const v = deferredAiReview?.suggestedIdentityYear;
    if (v == null) return;
    form.setValue("year", v);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.suggestedIdentityYear;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "year"])]);
    bumpAiAcceptedProvenance("year");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "identityYear" });
  };
  const acceptDeferredIdentityMake = () => {
    const v = deferredAiReview?.suggestedIdentityMake;
    if (!v) return;
    form.setValue("make", v);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.suggestedIdentityMake;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "make"])]);
    bumpAiAcceptedProvenance("make");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "identityMake" });
  };
  const acceptDeferredIdentityModel = () => {
    const v = deferredAiReview?.suggestedIdentityModel;
    if (!v) return;
    form.setValue("model", v);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.suggestedIdentityModel;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "model"])]);
    bumpAiAcceptedProvenance("model");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "identityModel" });
  };
  const acceptDeferredIdentityTrim = () => {
    const v = deferredAiReview?.suggestedIdentityTrim;
    if (v == null || !String(v).trim()) return;
    form.setValue("trim", v);
    stripDeferredPartial((d) => {
      const n = { ...d };
      delete n.suggestedIdentityTrim;
      return n;
    });
    setIntakeAiAcceptedFields((p) => [...new Set([...p, "trim"])]);
    bumpAiAcceptedProvenance("trim");
    void logIntakeReviewEventAction({ action: "accept", fieldGroup: "identityTrim" });
  };

  const renderIntakeBadges = (field: string) => {
    const bits: React.ReactNode[] = [];
    if (decoderFilledFields.includes(field)) {
      bits.push(
        <Badge key="dec" variant="secondary" className="text-[10px] font-normal shrink-0">
          From decoder · Needs review
        </Badge>
      );
    }
    const def = deferredAiReview;
    const pending =
      (field === "year" && def?.suggestedIdentityYear != null) ||
      (field === "make" && Boolean(def?.suggestedIdentityMake)) ||
      (field === "model" && Boolean(def?.suggestedIdentityModel)) ||
      (field === "trim" && def?.suggestedIdentityTrim != null && String(def.suggestedIdentityTrim).trim() !== "") ||
      (field === "mileage" && def?.mileage != null) ||
      (field === "exteriorColor" && Boolean(def?.exteriorColor)) ||
      (field === "interiorColor" && Boolean(def?.interiorColor)) ||
      (field === "conditionNotes" && Boolean(def?.conditionNotes)) ||
      (field === "internalNotes" && Boolean(def?.internalNotes)) ||
      (field === "titleStatus" && Boolean(def?.title)) ||
      (field === "highlights" && Boolean(def?.highlightSuggestions?.length)) ||
      (field === "features" && Boolean(def?.featureSuggestions?.length));
    if (pending) {
      bits.push(
        <Badge
          key="pend"
          variant="outline"
          className="text-[10px] font-normal shrink-0 border-amber-600/40 text-amber-950 dark:text-amber-100"
        >
          AI suggested · Pending accept
        </Badge>
      );
    } else if (intakeAiAcceptedFields.includes(field)) {
      bits.push(
        <Badge key="acc" variant="outline" className="text-[10px] font-normal shrink-0">
          AI suggested · Needs review
        </Badge>
      );
    }
    if (bits.length === 0) return null;
    return <span className="flex flex-wrap items-center gap-1.5">{bits}</span>;
  };

  const handleIntakeDocumentSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    if (isEdit && initialData?.id) {
      fd.append("vehicleId", initialData.id);
    }
    const formVin = (form.getValues("vin") || "").trim().toUpperCase();
    if (formVin) {
      fd.append("formVin", formVin);
    }

    setIntakeBusy(true);
    try {
      const result = await processVehicleIntakeDocumentAction(fd);

      if (!result.ok) {
        const extra =
          result.code === "AMBIGUOUS_VIN" && result.ambiguousCandidates?.length
            ? ` Candidates: ${result.ambiguousCandidates.join(", ")}.`
            : "";
        toast.error(`${result.message}${extra}`);
        if (result.vehicleId && result.createdDraft) {
          router.replace(`/admin/inventory/${result.vehicleId}/edit`);
        }
        return;
      }

      if (result.createdDraft) {
        sessionStorage.setItem(
          VEHICLE_INTAKE_STORAGE_KEY,
          JSON.stringify({
            extractedVin: result.extractedVin,
            decoded: result.decoded,
            decodeFailed: result.decodeFailed,
            requiresVinConfirmation: result.requiresVinConfirmation,
            requiresOcrVinReview: Boolean(result.requiresOcrVinReview),
            ocrVinCandidates: result.ocrVinCandidates,
            aiSuggestions: result.aiSuggestions,
            aiMeta: result.aiMeta,
            documentId: result.documentId,
          })
        );
        router.replace(`/admin/inventory/${result.vehicleId}/edit`);
        return;
      }

      if (result.requiresOcrVinReview && result.ocrVinCandidates?.length) {
        const cands = result.ocrVinCandidates;
        const ext = (result.extractedVin || "").trim().toUpperCase();
        const selectedVin = ext && cands.includes(ext) ? ext : cands[0]!;
        setPendingOcrVinReview({
          ocrVinCandidates: cands,
          selectedVin,
          documentId: result.documentId,
          aiSuggestions: result.aiSuggestions,
          aiMeta: result.aiMeta,
        });
        return;
      }

      if (result.requiresVinConfirmation) {
        setPendingVinIntake({
          extractedVin: result.extractedVin,
          decoded: result.decoded,
          decodeFailed: result.decodeFailed,
          aiSuggestions: result.aiSuggestions,
          aiMeta: result.aiMeta,
          documentId: result.documentId,
        });
        return;
      }

      mergeIntakeIntoForm({
        extractedVin: result.extractedVin,
        decoded: result.decoded,
        decodeFailed: result.decodeFailed,
        aiSuggestions: result.aiSuggestions,
        aiMeta: result.aiMeta,
        documentId: result.documentId,
      });
    } finally {
      setIntakeBusy(false);
    }
  };

  const confirmUseDocumentVin = () => {
    if (!pendingVinIntake) return;
    mergeIntakeIntoForm(pendingVinIntake);
    setPendingVinIntake(null);
  };

  const confirmKeepCurrentVin = async () => {
    const current = (form.getValues("vin") || "").trim().toUpperCase();
    setPendingVinIntake(null);
    setLastIntakeSummary(null);
    setIntakeAiAcceptedFields([]);
    setDecoderFilledFields([]);
    setDeferredAiReview(null);
    intakeProvenanceRef.current = parseIntakeFieldProvenanceJson(
      initialData?.intakeFieldProvenance ?? null
    );
    lastIntakeDocumentIdRef.current = null;
    if (current.length !== 17) {
      toast.error("Enter a valid 17-character VIN, then use Re-run decode if needed.");
      return;
    }
    setIsDecoding(true);
    try {
      const beforeDecoder = snapshotDecoderSlice(form.getValues());
      const data = await decodeVin(current);
      if (data) {
        applyVinMetadataToVehicleForm(form.setValue, form.getValues, data);
        const afterDecoder = snapshotDecoderSlice(form.getValues());
        const decoderKeys = diffDecoderFilledFields(beforeDecoder, afterDecoder);
        setDecoderFilledFields(decoderKeys);
        const now = new Date().toISOString();
        const decoderUpdates = Object.fromEntries(
          decoderKeys.map((k) => [k, { source: "decoder" as const, acceptedAt: now }])
        );
        intakeProvenanceRef.current = mergeIntakeProvenanceFields(
          intakeProvenanceRef.current,
          decoderUpdates,
          undefined
        );
        toast.success("Kept your VIN and applied decode data to empty fields.");
      } else {
        toast.error("Could not decode your VIN. Fill in details manually.");
      }
    } catch {
      toast.error("VIN API error. Fill in details manually.");
    } finally {
      setIsDecoding(false);
    }
  };

  const onSubmit = async (values: VehicleFormValues, status?: VehicleStatus) => {
    setIsSubmitting(true);
    try {
      const provInitial = parseIntakeFieldProvenanceJson(initialData?.intakeFieldProvenance ?? null);
      const intakeDraftPriceUnset =
        isEdit &&
        initialData?.vehicleStatus === "DRAFT" &&
        provInitial?.intakePlaceholderPrice === true &&
        isIntakePlaceholderPriceValue(Number(initialData?.price));

      const priceRaw = values.price;
      const priceEmpty =
        priceRaw === "" ||
        priceRaw === undefined ||
        (typeof priceRaw === "number" && Number.isNaN(priceRaw));

      let effectivePrice: number;
      if (priceEmpty) {
        if (intakeDraftPriceUnset) {
          effectivePrice = INTAKE_PLACEHOLDER_PRICE;
        } else {
          form.setError("price", { message: "Enter a listing price" });
          setIsSubmitting(false);
          return;
        }
      } else {
        effectivePrice = typeof priceRaw === "number" ? priceRaw : Number(priceRaw);
        if (Number.isNaN(effectivePrice) || effectivePrice < 1000) {
          form.setError("price", { message: "Price must be at least $1,000" });
          setIsSubmitting(false);
          return;
        }
      }

      if (intakeProvenanceRef.current && effectivePrice !== INTAKE_PLACEHOLDER_PRICE) {
        intakeProvenanceRef.current = {
          ...intakeProvenanceRef.current,
          intakePlaceholderPrice: false,
        };
      }

      const valuesForSave: VehicleFormValues = { ...values, price: effectivePrice };

      // 1. Check VIN uniqueness
      const isUnique = await isVinUnique(valuesForSave.vin, initialData?.id);
      if (!isUnique) {
        form.setError("vin", { message: "A vehicle with this VIN already exists" });
        setIsSubmitting(false);
        return;
      }

      if (!isEdit) {
        // 2. Additional Publish Validation (Only for Creation)
        if (status === "LISTED") {
          if (!valuesForSave.description) {
            form.setError("description", { message: "Description is required to publish" });
            setIsSubmitting(false);
            return;
          }
          if (photos.length === 0) {
            toast.error("At least one photo is required to publish");
            setIsSubmitting(false);
            return;
          }
        }

        // 3. Submit Create
        const formData = new FormData();
        formData.append("status", status!);
        Object.entries(valuesForSave).forEach(([key, value]) => {
          if (key === "highlights" || key === "features") {
            (value as string[]).forEach((v) => formData.append(key, v));
          } else if (value !== undefined && value !== null && key !== "photos") {
            formData.append(key, value.toString());
          }
        });
        photos.forEach((photo) => formData.append("photos", photo));

        const prov = intakeProvenanceRef.current;
        if (
          prov &&
          (Object.keys(prov.fields).length > 0 ||
            prov.documentId ||
            prov.intakePlaceholderPrice !== undefined)
        ) {
          formData.append("intakeFieldProvenance", JSON.stringify(prov));
        }

        await createVehicleAction(formData);
        toast.success(status === "LISTED" ? "Vehicle published successfully" : "Vehicle saved as draft");
      } else {
        // 3. Submit Update (Field only)
        const formData = new FormData();
        Object.entries(valuesForSave).forEach(([key, value]) => {
          if (key === "highlights" || key === "features") {
            (value as string[]).forEach((v) => formData.append(key, v));
          } else if (value !== undefined && value !== null && key !== "photos") {
            formData.append(key, value.toString());
          }
        });

        const provEdit = intakeProvenanceRef.current;
        if (
          provEdit &&
          (Object.keys(provEdit.fields).length > 0 ||
            provEdit.documentId ||
            provEdit.intakePlaceholderPrice !== undefined)
        ) {
          formData.append("intakeFieldProvenance", JSON.stringify(provEdit));
        }

        await updateVehicleAction(initialData.id, formData);
        toast.success("Vehicle updated successfully");
        router.push("/admin/inventory");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos([...photos, ...Array.from(e.target.files)]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const setPrimaryPhoto = (index: number) => {
    const newPhotos = [...photos];
    const [selected] = newPhotos.splice(index, 1);
    newPhotos.unshift(selected);
    setPhotos(newPhotos);
    toast.success("Primary photo updated");
  };

  const resolvedOcrVinForConfirm = pendingOcrVinReview
    ? resolveOcrVinRadioValue(pendingOcrVinReview).trim().toUpperCase()
    : "";
  const canConfirmOcrVin =
    pendingOcrVinReview != null &&
    pendingOcrVinReview.ocrVinCandidates.length > 0 &&
    resolvedOcrVinForConfirm.length === 17 &&
    isValidVinCheckDigit(resolvedOcrVinForConfirm);

  return (
    <Form {...form}>
      <form className="space-y-8 pb-24">
        {/* Section 1: Identification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              1. Vehicle Identification
              {section1Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <FormField
                control={form.control}
                name="vin"
                render={({ field, fieldState }) => (
                  <FormItem className="flex-grow">
                    <FormLabel>VIN</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="17-character VIN"
                        {...field}
                        ref={(el) => {
                          vinInputRef.current = el;
                          field.ref(el);
                        }}
                        value={field.value || ""}
                        maxLength={17}
                        className={cn("uppercase font-mono", requiredFieldErrorClass("vin", fieldState.invalid))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="button" 
                variant="secondary" 
                className="h-10 px-6 font-bold shadow-sm border-2 border-primary/10 hover:border-primary/30"
                onClick={handleDecodeVin}
                disabled={isDecoding || intakeBusy}
              >
                {isDecoding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Re-run decode
              </Button>
            </div>

            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Optional: upload a document</p>
              <p className="text-xs text-muted-foreground">
                PDF, JPG/JPEG, or PNG (max 10MB). We find and validate the VIN, then run NHTSA decode (empty fields
                only). Photos are read as images; PDFs use extracted text first. If the read is uncertain, we&apos;ll
                ask you to confirm. Use <span className="font-medium text-foreground">Re-run decode</span> after you edit
                the VIN. Your listing description and price are never changed by this step.
              </p>
              <input
                ref={intakeFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={handleIntakeDocumentSelected}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={intakeBusy || isDecoding}
                onClick={() => intakeFileInputRef.current?.click()}
              >
                {intakeBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload document
                  </>
                )}
              </Button>
            </div>

            {lastIntakeSummary && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/25 p-4 space-y-4 text-sm">
                <p className="font-semibold text-foreground">Document intake summary (review required)</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  VIN was set from your upload. NHTSA decode runs for that VIN and only fills empty identity fields.
                  Change the VIN and use <span className="font-medium text-foreground">Re-run decode</span> if you need a
                  fresh decode.
                </p>

                <div className="grid gap-3">
                  <div className="rounded-md border border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/20 p-3 space-y-2">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      1 · Auto-filled from VIN and documents
                    </p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                      <li>
                        <span className="font-medium text-foreground">VIN </span>
                        was taken from your upload (AI-assisted read where enabled, with validation — text/OCR fallback
                        when needed).
                      </li>
                      {lastIntakeSummary.decodeFailed ? (
                        <li>
                          <span className="font-medium text-foreground">Decode: </span>
                          NHTSA did not return structured data — use the summary below for any AI identity hints (Accept
                          to apply), or enter fields manually.
                        </li>
                      ) : lastIntakeSummary.intakeDecoderFilledKeys.length > 0 ? (
                        <li>
                          <span className="font-medium text-foreground">Decoder: </span>
                          Filled empty fields:{" "}
                          {humanizeDecoderSummaryKeys(lastIntakeSummary.intakeDecoderFilledKeys)}.
                        </li>
                      ) : (
                        <li>
                          <span className="font-medium text-foreground">Decoder: </span>
                          No decoder-backed fields were empty to fill (values already matched or NHTSA did not supply
                          them).
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-md border border-violet-500/30 bg-violet-50/40 dark:bg-violet-950/20 p-3 space-y-3">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      2 · AI suggestions for review
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {intakeSummaryAiDescription(lastIntakeSummary.aiMeta)}
                    </p>

                    {deferredAiReview && deferredAiReviewHasPending(deferredAiReview) ? (
                      <div className="space-y-3">
                    {deferredAiReview.suggestedIdentityYear != null ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs">
                          <span className="font-medium text-foreground">Year (AI hint): </span>
                          {deferredAiReview.suggestedIdentityYear}
                          {formatAiConfidence(lastIntakeSummary.aiSuggestions?.suggestedYearConfidence) ? (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {formatAiConfidence(lastIntakeSummary.aiSuggestions?.suggestedYearConfidence)}
                            </span>
                          ) : null}
                        </span>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredIdentityYear}>
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "identityYear" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.suggestedIdentityYear;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.suggestedIdentityMake ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs">
                          <span className="font-medium text-foreground">Make (AI hint): </span>
                          {deferredAiReview.suggestedIdentityMake}
                          {formatAiConfidence(lastIntakeSummary.aiSuggestions?.suggestedMakeConfidence) ? (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {formatAiConfidence(lastIntakeSummary.aiSuggestions?.suggestedMakeConfidence)}
                            </span>
                          ) : null}
                        </span>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredIdentityMake}>
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "identityMake" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.suggestedIdentityMake;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.suggestedIdentityModel ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs">
                          <span className="font-medium text-foreground">Model (AI hint): </span>
                          {deferredAiReview.suggestedIdentityModel}
                          {formatAiConfidence(lastIntakeSummary.aiSuggestions?.suggestedModelConfidence) ? (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {formatAiConfidence(lastIntakeSummary.aiSuggestions?.suggestedModelConfidence)}
                            </span>
                          ) : null}
                        </span>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredIdentityModel}>
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "identityModel" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.suggestedIdentityModel;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.suggestedIdentityTrim != null && String(deferredAiReview.suggestedIdentityTrim).trim() ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs">
                          <span className="font-medium text-foreground">Trim (AI hint): </span>
                          {deferredAiReview.suggestedIdentityTrim}
                          {formatAiConfidence(lastIntakeSummary.aiSuggestions?.suggestedTrimConfidence) ? (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {formatAiConfidence(lastIntakeSummary.aiSuggestions?.suggestedTrimConfidence)}
                            </span>
                          ) : null}
                        </span>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredIdentityTrim}>
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "identityTrim" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.suggestedIdentityTrim;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.mileage != null ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs">
                          <span className="font-medium text-foreground">Mileage: </span>
                          {deferredAiReview.mileage.toLocaleString()} mi
                          {formatAiConfidence(lastIntakeSummary.aiSuggestions?.mileageConfidence) ? (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {formatAiConfidence(lastIntakeSummary.aiSuggestions?.mileageConfidence)}
                            </span>
                          ) : null}
                        </span>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="default" className="h-8" onClick={acceptDeferredMileage}>
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "mileage" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.mileage;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.exteriorColor ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs">
                          <span className="font-medium text-foreground">Exterior color: </span>
                          {deferredAiReview.exteriorColor}
                          {formatAiConfidence(lastIntakeSummary.aiSuggestions?.exteriorColorConfidence) ? (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {formatAiConfidence(lastIntakeSummary.aiSuggestions?.exteriorColorConfidence)}
                            </span>
                          ) : null}
                        </span>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredExterior}>
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "exteriorColor" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.exteriorColor;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.interiorColor ? (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs">
                          <span className="font-medium text-foreground">Interior color: </span>
                          {deferredAiReview.interiorColor}
                          {formatAiConfidence(lastIntakeSummary.aiSuggestions?.interiorColorConfidence) ? (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">
                              {formatAiConfidence(lastIntakeSummary.aiSuggestions?.interiorColorConfidence)}
                            </span>
                          ) : null}
                        </span>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredInterior}>
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "interiorColor" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.interiorColor;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.conditionNotes ? (
                      <div className="flex flex-col gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs font-medium text-foreground">Condition notes</span>
                        {formatAiConfidence(lastIntakeSummary.aiSuggestions?.conditionNotesConfidence) ? (
                          <span className="text-[10px] text-muted-foreground -mt-1">
                            {formatAiConfidence(lastIntakeSummary.aiSuggestions?.conditionNotesConfidence)}
                          </span>
                        ) : null}
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">
                          {deferredAiReview.conditionNotes}
                        </p>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredConditionNotes}>
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "conditionNotes" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.conditionNotes;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.internalNotes ? (
                      <div className="flex flex-col gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs font-medium text-foreground">Internal notes</span>
                        {formatAiConfidence(lastIntakeSummary.aiSuggestions?.internalNotesConfidence) ? (
                          <span className="text-[10px] text-muted-foreground -mt-1">
                            {formatAiConfidence(lastIntakeSummary.aiSuggestions?.internalNotesConfidence)}
                          </span>
                        ) : null}
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-24 overflow-y-auto">
                          {deferredAiReview.internalNotes}
                        </p>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredInternalNotes}>
                            Accept
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "internalNotes" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.internalNotes;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.title ? (
                      <div className="flex flex-col gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs font-medium text-foreground">Title status / notes</span>
                        {formatAiConfidence(lastIntakeSummary.aiSuggestions?.titleStatusConfidence) ? (
                          <span className="text-[10px] text-muted-foreground -mt-1">
                            {formatAiConfidence(lastIntakeSummary.aiSuggestions?.titleStatusConfidence)}
                          </span>
                        ) : null}
                        {deferredAiReview.title.statusHint ? (
                          <p className="text-xs text-muted-foreground">
                            Suggested status:{" "}
                            <span className="font-medium text-foreground">
                              {TITLE_STATUS_LABELS[deferredAiReview.title.statusHint]}
                            </span>
                          </p>
                        ) : null}
                        {deferredAiReview.title.notes?.trim() ? (
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {deferredAiReview.title.notes}
                          </p>
                        ) : null}
                        <p className="text-[10px] text-muted-foreground">
                          Accept applies title status when shown, and appends title notes to internal notes (does not
                          replace existing internal notes).
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredTitle}>
                            {deferredAiReview.title.statusHint && deferredAiReview.title.notes?.trim()
                              ? "Accept status & notes"
                              : deferredAiReview.title.statusHint
                                ? "Accept title status"
                                : "Accept (append notes to internal notes)"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "title" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.title;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.highlightSuggestions && deferredAiReview.highlightSuggestions.length > 0 ? (
                      <div className="flex flex-col gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs font-medium text-foreground">Suggested highlights (not applied yet)</span>
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 max-h-28 overflow-y-auto">
                          {deferredAiReview.highlightSuggestions.map((h) => (
                            <li key={h}>{h}</li>
                          ))}
                        </ul>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredHighlights}>
                            Accept (append to highlights)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "highlights" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.highlightSuggestions;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {deferredAiReview.featureSuggestions && deferredAiReview.featureSuggestions.length > 0 ? (
                      <div className="flex flex-col gap-2 rounded-md border bg-background/60 p-3">
                        <span className="text-xs font-medium text-foreground">Suggested features (not applied yet)</span>
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5 max-h-28 overflow-y-auto">
                          {deferredAiReview.featureSuggestions.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" className="h-8" onClick={acceptDeferredFeatures}>
                            Accept (append to features)
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => {
                              void logIntakeReviewEventAction({ action: "reject", fieldGroup: "features" });
                              stripDeferredPartial((d) => {
                                const n = { ...d };
                                delete n.featureSuggestions;
                                return n;
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                    ) : lastIntakeSummary.aiMeta.status === "applied" ? (
                      <p className="text-xs text-muted-foreground italic">
                        No AI suggestions are waiting — the model had nothing to add, or your form already had values in
                        those fields.
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-md border border-amber-700/25 bg-background/80 p-3 space-y-2">
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      3 · Still needed from you
                    </p>
                    {intakeStillNeededLabels.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No required gaps flagged from this checklist — still verify identity, photos, and listing price
                        before publishing.
                      </p>
                    ) : (
                      <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                        {intakeStillNeededLabels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground border-t border-amber-500/20 pt-3">
                  <span className="font-medium text-foreground">Field legend: </span>
                  <Badge variant="secondary" className="text-[10px] mx-1">
                    From decoder · Needs review
                  </Badge>
                  <Badge variant="outline" className="text-[10px] mx-1 border-amber-600/40">
                    AI suggested · Pending accept
                  </Badge>
                  <Badge variant="outline" className="text-[10px] mx-1">
                    AI suggested · Needs review
                  </Badge>
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="year"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="flex flex-wrap items-center gap-2">
                      Year
                      {renderIntakeBadges("year")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ""}
                        className={cn(requiredFieldErrorClass("year", fieldState.invalid), intakeFieldReviewClass("year"))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="make"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="flex flex-wrap items-center gap-2">
                      Make
                      {renderIntakeBadges("make")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Tesla, Rivian"
                        {...field}
                        value={field.value || ""}
                        className={cn(requiredFieldErrorClass("make", fieldState.invalid), intakeFieldReviewClass("make"))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="flex flex-wrap items-center gap-2">
                      Model
                      {renderIntakeBadges("model")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Model 3, R1S"
                        {...field}
                        value={field.value || ""}
                        className={cn(requiredFieldErrorClass("model", fieldState.invalid), intakeFieldReviewClass("model"))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="trim"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2">
                    <FormLabel className="flex flex-wrap items-center gap-2">
                      Trim (Optional)
                      {renderIntakeBadges("trim")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Performance, Adventure"
                        {...field}
                        value={field.value || ""}
                        className={cn(intakeFieldReviewClass("trim"))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Specifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              2. Specifications
              {section2Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="mileage"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="flex flex-wrap items-center gap-2">
                    Mileage
                    {renderIntakeBadges("mileage")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value || ""}
                      className={cn(
                        requiredFieldErrorClass("mileage", fieldState.invalid),
                        intakeFieldReviewClass("mileage")
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="drivetrain"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="flex flex-wrap items-center gap-2">
                    Drivetrain
                    {renderIntakeBadges("drivetrain")}
                  </FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(value) => field.onChange(value || null)}
                  >
                    <FormControl>
                      <SelectTrigger
                        className={cn(
                          requiredFieldErrorClass("drivetrain", fieldState.invalid),
                          intakeFieldReviewClass("drivetrain")
                        )}
                      >
                        <SelectValue placeholder="Select drivetrain" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DRIVETRAIN_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bodyStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Body Style (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Sedan, SUV" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuel Type (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Gasoline, Electric" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transmission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex flex-wrap items-center gap-2">
                    Transmission (Optional)
                    {renderIntakeBadges("transmission")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Automatic, CVT"
                      {...field}
                      value={field.value ?? ""}
                      className={cn(intakeFieldReviewClass("transmission"))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="doors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doors (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" min={2} max={5} placeholder="2–5" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="batteryRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Battery Range (mi)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(() => {
              const fuelType = form.watch("fuelType");
              const ft = (fuelType ?? "").trim().toLowerCase();
              const isElectric = ft.includes("electric") || ft.includes("battery") || ft === "ev" || ft.includes("bev") || ft.includes("phev");
              if (!isElectric) return null;
              return (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
                  <Separator className="my-6" />
                  <p className="text-sm font-medium text-muted-foreground">EV specifications (optional)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 min-w-0">
                    <FormField
                      control={form.control}
                      name="batteryCapacityKWh"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Battery Capacity (kWh)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} max={500} step={0.1} placeholder="e.g. 75" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="batteryChemistry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Battery Chemistry</FormLabel>
                          <Select onValueChange={(v) => field.onChange(v === "" ? null : v)} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select or leave empty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">—</SelectItem>
                              <SelectItem value="LFP">LFP</SelectItem>
                              <SelectItem value="NMC">NMC</SelectItem>
                              <SelectItem value="NCA">NCA</SelectItem>
                              <SelectItem value="LMO">LMO</SelectItem>
                              <SelectItem value="LCO">LCO</SelectItem>
                              <SelectItem value="Unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="chargingStandard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Charging Standard</FormLabel>
                          <Select onValueChange={(v) => field.onChange(v === "" ? null : v)} value={field.value ?? ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select or leave empty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">—</SelectItem>
                              <SelectItem value="NACS">NACS</SelectItem>
                              <SelectItem value="CCS">CCS</SelectItem>
                              <SelectItem value="CHAdeMO">CHAdeMO</SelectItem>
                              <SelectItem value="J1772">J1772</SelectItem>
                              <SelectItem value="Unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              );
            })()}
              <FormField
                control={form.control}
                name="exteriorColor"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="flex flex-wrap items-center gap-2">
                      Exterior Color
                      {renderIntakeBadges("exteriorColor")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Midnight Silver"
                        {...field}
                        value={field.value || ""}
                        className={cn(
                          requiredFieldErrorClass("exteriorColor", fieldState.invalid),
                          intakeFieldReviewClass("exteriorColor")
                        )}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
              <FormField
                control={form.control}
                name="interiorColor"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="flex flex-wrap items-center gap-2">
                      Interior Color
                      {renderIntakeBadges("interiorColor")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Black Vegan Leather"
                        {...field}
                        value={field.value || ""}
                        className={cn(
                          requiredFieldErrorClass("interiorColor", fieldState.invalid),
                          intakeFieldReviewClass("interiorColor")
                        )}
                      />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 3: Condition & History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              3. Condition & History
              {section3Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="condition"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Inventory Condition</FormLabel>
                    <Select
                    value={field.value ?? ""}
                    onValueChange={(value) => field.onChange(value || null)}
                  >
                      <FormControl>
                        <SelectTrigger className={requiredFieldErrorClass("condition", fieldState.invalid)}>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(INVENTORY_CONDITION_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="titleStatus"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="flex flex-wrap items-center gap-2">
                      Title Status
                      {renderIntakeBadges("titleStatus")}
                    </FormLabel>
                    <Select
                    value={field.value ?? ""}
                    onValueChange={(value) => field.onChange(value || null)}
                  >
                      <FormControl>
                        <SelectTrigger
                          className={cn(
                            requiredFieldErrorClass("titleStatus", fieldState.invalid),
                            intakeFieldReviewClass("titleStatus")
                          )}
                        >
                          <SelectValue placeholder="Select title status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TITLE_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="conditionNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex flex-wrap items-center gap-2">
                    Condition Notes (Optional)
                    {renderIntakeBadges("conditionNotes")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detail any scratches, interior wear, or unique history..."
                      className={cn("min-h-[100px]", intakeFieldReviewClass("conditionNotes"))}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 4: Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              4. Pricing
              {section4Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="price"
              render={({ field, fieldState }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Listing Price (USD)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5">$</span>
                      <Input type="number" className={cn("pl-6", requiredFieldErrorClass("price", fieldState.invalid))} {...field} value={field.value || ""} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 5: Description & Highlights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              5. Description & Highlights
              {section5Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Required for Publish)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write a compelling description for the public listing..."
                      className="min-h-[200px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className={cn("space-y-4", intakeFieldReviewClass("highlights"))}>
              <FormLabel className="flex flex-wrap items-center gap-2">
                Vehicle Highlights (Optional)
                {renderIntakeBadges("highlights")}
              </FormLabel>
              <div className="flex flex-wrap gap-2">
                {highlightFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 bg-muted p-2 rounded-md">
                    <Input
                      {...form.register(`highlights.${index}` as any)}
                      className="h-8 w-48 border-none bg-transparent"
                      placeholder="e.g., New Tires"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeHighlight(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendHighlight("")}
                  disabled={highlightFields.length >= 20}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Highlight
                </Button>
              </div>
            </div>

            <div className={cn("space-y-4", intakeFieldReviewClass("features"))}>
              <FormLabel className="flex flex-wrap items-center gap-2">
                Feature Checklist (Optional)
                {renderIntakeBadges("features")}
              </FormLabel>
              <div className="flex flex-wrap gap-2">
                {featureFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 bg-muted p-2 rounded-md">
                    <Input
                      {...form.register(`features.${index}` as any)}
                      className="h-8 w-48 border-none bg-transparent"
                      placeholder="e.g., Autopilot"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFeature(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendFeature("")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Feature
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Photos (Only for Creation in this pass) */}
        {!isEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                6. Photos
                {section6Complete ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Click or drag photos to upload</p>
                  <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. Max 10MB each.</p>
                </div>
              </div>

              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square rounded-md overflow-hidden border shadow-sm">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index}`}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-1 right-1 flex gap-1">
                        {index !== 0 && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setPrimaryPhoto(index)}
                            title="Set as Primary"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {index === 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-primary/90 text-primary-foreground text-[10px] font-bold py-1 text-center flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Primary Image
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <FormDescription>At least 1 photo is required to publish.</FormDescription>
            </CardContent>
          </Card>
        )}

        {/* Section 7: Internal Notes */}
        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? "6. Internal Notes" : "7. Internal Notes"}</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="internalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex flex-wrap items-center gap-2">
                    Internal-Only Notes (Private)
                    {renderIntakeBadges("internalNotes")}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes for dealer use only. Acquisition cost, service status, etc..."
                      className={cn("min-h-[100px]", intakeFieldReviewClass("internalNotes"))}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>These notes are never visible to customers.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Dialog
          open={!!pendingOcrVinReview}
          onOpenChange={(open) => {
            if (!open) setPendingOcrVinReview(null);
          }}
        >
          <DialogContent className="sm:max-w-md" showCloseButton>
            <DialogHeader>
              <DialogTitle>Confirm VIN from document</DialogTitle>
              <DialogDescription>
                The VIN did not pass auto-accept (checksum, model confidence, or both). Confirm the correct 17-character
                VIN from your upload, or enter it manually. We only run the decoder after you confirm. If the VIN in
                your form differs, you&apos;ll get a second prompt to choose which to keep.
              </DialogDescription>
            </DialogHeader>
            {pendingOcrVinReview && pendingOcrVinReview.ocrVinCandidates.length > 0 ? (
              <RadioGroup
                value={resolveOcrVinRadioValue(pendingOcrVinReview)}
                onValueChange={(v) =>
                  setPendingOcrVinReview((prev) => (prev ? { ...prev, selectedVin: v } : prev))
                }
                className="grid gap-3 py-2"
              >
                {pendingOcrVinReview.ocrVinCandidates.map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <RadioGroupItem value={v} id={`ocr-vin-${v}`} />
                    <label htmlFor={`ocr-vin-${v}`} className="font-mono text-sm cursor-pointer leading-none">
                      {v}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            ) : null}
            <DialogFooter className="flex-col sm:flex-row gap-2 border-0 bg-transparent p-0 pt-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setPendingOcrVinReview(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPendingOcrVinReview(null);
                  toast.message("Enter the VIN in the field above, then use Re-run decode if needed.");
                  vinInputRef.current?.focus();
                }}
              >
                Edit manually
              </Button>
              <Button
                type="button"
                onClick={() => void handleConfirmOcrVin()}
                disabled={isDecoding || intakeBusy || !canConfirmOcrVin}
              >
                {isDecoding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Use this VIN
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!pendingVinIntake}
          onOpenChange={(open) => {
            if (!open) setPendingVinIntake(null);
          }}
        >
          <DialogContent className="sm:max-w-md" showCloseButton>
            <DialogHeader>
              <DialogTitle>Confirm VIN from document</DialogTitle>
              <DialogDescription>
                The VIN in your form ({(form.getValues("vin") || "").trim().toUpperCase() || "—"}) does not match the
                one found in the upload ({pendingVinIntake?.extractedVin ?? "—"}). Use the document VIN only if you are
                sure it is correct.                 Decoder data fills empty fields only; description, price, and listing copy stay
                unchanged. Document AI never replaces decoder identity fields and only fills empty
                placeholders unless you apply a title status suggestion explicitly.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end gap-2 border-0 bg-transparent p-0 pt-2">
              <Button type="button" variant="outline" onClick={confirmKeepCurrentVin}>
                Keep my VIN
              </Button>
              <Button type="button" onClick={confirmUseDocumentVin}>
                Use document VIN
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-background/80 backdrop-blur-sm border-t p-4 z-20 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <div className="flex gap-4">
              {!isEdit ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={form.handleSubmit((v) => onSubmit(v, "DRAFT"))}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={form.handleSubmit((v) => onSubmit(v, "LISTED"))}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Publish Vehicle
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={form.handleSubmit((v) => onSubmit(v))}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
