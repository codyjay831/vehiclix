import * as React from "react";
import { 
  Gauge, 
  Battery, 
  Activity, 
  Paintbrush, 
  Armchair, 
  FileText, 
  CheckCircle2, 
  Calendar,
  Zap
} from "lucide-react";
import { SerializedVehicle, DRIVETRAIN_LABELS, INVENTORY_CONDITION_LABELS, TITLE_STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface VehicleSpecsProps {
  vehicle: SerializedVehicle;
}

export function VehicleSpecs({ vehicle }: VehicleSpecsProps) {
  const specs = [
    { label: "Year", value: vehicle.year, icon: Calendar },
    { label: "Mileage", value: `${vehicle.mileage.toLocaleString()} mi`, icon: Gauge },
    { label: "Drivetrain", value: DRIVETRAIN_LABELS[vehicle.drivetrain].replace(/ \(.*\)/, ''), icon: Zap },
    { label: "Range (Est)", value: vehicle.batteryRangeEstimate ? `${vehicle.batteryRangeEstimate} mi` : "N/A", icon: Battery },
    { label: "Exterior", value: vehicle.exteriorColor, icon: Paintbrush },
    { label: "Interior", value: vehicle.interiorColor, icon: Armchair },
    { label: "Condition", value: INVENTORY_CONDITION_LABELS[vehicle.condition], icon: Activity },
    { label: "Title Status", value: TITLE_STATUS_LABELS[vehicle.titleStatus], icon: FileText },
    { label: "VIN", value: vehicle.vin, icon: CheckCircle2, mono: true },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-8 border-y bg-muted/20 px-6 rounded-2xl">
      {specs.map((spec) => (
        <div key={spec.label} className="flex items-center gap-4 group">
          <div className="p-3 bg-background rounded-xl border-2 group-hover:border-primary/30 transition-colors">
            <spec.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {spec.label}
            </span>
            <span className={cn(
              "text-base font-bold tracking-tight",
              spec.mono && "font-mono text-xs uppercase"
            )}>
              {spec.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
