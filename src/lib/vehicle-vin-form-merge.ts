/**
 * Single mapping path from NHTSA-normalized VIN decode metadata into the admin vehicle form.
 * Used by manual "Decode VIN" and smart document intake (Phase 1).
 * Does not modify description, price, condition, conditionNotes, or internalNotes.
 */

import type { UseFormGetValues, UseFormSetValue } from "react-hook-form";
import type { VinMetadata } from "@/lib/vin";
import {
  isIntakePlaceholderIdentityPair,
  isIntakePlaceholderMake,
  isIntakePlaceholderModel,
} from "@/lib/intake-draft-placeholders";

/** Form shape subset — keep aligned with VehicleFormValues in VehicleForm.tsx */
export type VehicleVinFormValues = {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  bodyStyle?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  doors?: number | null;
  batteryCapacityKWh?: number | null;
  drivetrain?: string | null;
  highlights?: string[];
};

const isStringEmpty = (v: unknown) => v == null || v === undefined || !String(v ?? "").trim();
const isNumberEmpty = (v: unknown) =>
  v == null || v === undefined || v === "" || (typeof v === "number" && (Number.isNaN(v) || v === 0));

function decoderMayFillMake(getValues: UseFormGetValues<VehicleVinFormValues>): boolean {
  const v = getValues("make" as never);
  return isStringEmpty(v) || isIntakePlaceholderMake(v);
}

function decoderMayFillModel(getValues: UseFormGetValues<VehicleVinFormValues>): boolean {
  const v = getValues("model" as never);
  return isStringEmpty(v) || isIntakePlaceholderModel(v);
}

export function applyVinMetadataToVehicleForm<T extends VehicleVinFormValues>(
  setValue: UseFormSetValue<T>,
  getValues: UseFormGetValues<T>,
  data: VinMetadata
): void {
  const gv = getValues as unknown as UseFormGetValues<VehicleVinFormValues>;
  const identityWasIntakePlaceholder = isIntakePlaceholderIdentityPair(gv("make" as never), gv("model" as never));

  const decoderMayFillYear = (): boolean => {
    const y = gv("year" as never);
    if (isNumberEmpty(y)) return true;
    return identityWasIntakePlaceholder;
  };

  const decoderMayFillDrivetrain = (): boolean => {
    const v = gv("drivetrain" as never);
    if (isStringEmpty(v)) return true;
    return identityWasIntakePlaceholder;
  };

  if (data.year != null && decoderMayFillYear()) {
    setValue("year" as never, data.year as never);
  }
  if (data.make && decoderMayFillMake(gv)) {
    setValue("make" as never, data.make as never);
  }
  if (data.model && decoderMayFillModel(gv)) {
    setValue("model" as never, data.model as never);
  }
  if (data.trim != null && isStringEmpty(getValues("trim" as never))) {
    setValue("trim" as never, data.trim as never);
  }
  if (data.drivetrain && decoderMayFillDrivetrain()) {
    setValue("drivetrain" as never, data.drivetrain as never);
  }
  if (data.bodyStyle != null && isStringEmpty(getValues("bodyStyle" as never))) {
    setValue("bodyStyle" as never, data.bodyStyle as never);
  }
  if (data.fuelType != null && isStringEmpty(getValues("fuelType" as never))) {
    setValue("fuelType" as never, data.fuelType as never);
  }
  if (data.transmission != null && isStringEmpty(getValues("transmission" as never))) {
    setValue("transmission" as never, data.transmission as never);
  }
  if (data.doors != null && isNumberEmpty(getValues("doors" as never))) {
    setValue("doors" as never, data.doors as never);
  }
  if (data.batteryCapacityKWh != null && isNumberEmpty(getValues("batteryCapacityKWh" as never))) {
    setValue("batteryCapacityKWh" as never, data.batteryCapacityKWh as never);
  }

  const currentHighlights = (getValues("highlights" as never) as unknown as string[] | undefined) || [];
  const newHighlights = [...currentHighlights];
  if (data.engine && !newHighlights.includes(`Engine: ${data.engine}`)) {
    newHighlights.push(`Engine: ${data.engine}`);
  }
  if (data.horsepower && !newHighlights.includes(`${data.horsepower} HP`)) {
    newHighlights.push(`${data.horsepower} HP`);
  }
  setValue("highlights" as never, newHighlights as never);
}
