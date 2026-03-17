"use client";

import * as React from "react";
import { SerializedVehicle } from "@/types";
import { DRIVETRAIN_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface VehicleSpecChipsProps {
  vehicle: SerializedVehicle;
  className?: string;
}

/**
 * Compact, premium spec chips for quick scan on the VDP.
 * Renders only when value exists. Order: fuel, body, transmission, doors, drivetrain, battery (EV), trim.
 */
export function VehicleSpecChips({ vehicle, className }: VehicleSpecChipsProps) {
  const chips: { label: string; value: string }[] = [];

  if (vehicle.fuelType?.trim()) chips.push({ label: "Fuel", value: vehicle.fuelType.trim() });
  if (vehicle.bodyStyle?.trim()) chips.push({ label: "Body", value: vehicle.bodyStyle.trim() });
  if (vehicle.transmission?.trim()) chips.push({ label: "Transmission", value: vehicle.transmission.trim() });
  if (vehicle.doors != null) chips.push({ label: "Doors", value: String(vehicle.doors) });
  chips.push({ label: "Drivetrain", value: DRIVETRAIN_LABELS[vehicle.drivetrain].replace(/ \(.*\)/, "").trim() });
  if (vehicle.batteryCapacityKWh != null) chips.push({ label: "Battery", value: `${vehicle.batteryCapacityKWh} kWh` });
  if (vehicle.trim?.trim()) chips.push({ label: "Trim", value: vehicle.trim.trim() });

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {chips.map(({ label, value }) => (
        <span
          key={`${label}-${value}`}
          className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-foreground/90"
        >
          <span className="text-muted-foreground mr-1.5">{label}:</span>
          {value}
        </span>
      ))}
    </div>
  );
}
