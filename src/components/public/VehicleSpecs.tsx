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
  Zap,
  Car,
  Fuel,
  Settings,
  DoorOpen,
  BatteryCharging,
  FlaskConical,
  Plug
} from "lucide-react";
import { SerializedVehicle, DRIVETRAIN_LABELS, INVENTORY_CONDITION_LABELS, TITLE_STATUS_LABELS } from "@/types";
import { cn } from "@/lib/utils";

interface VehicleSpecsProps {
  vehicle: SerializedVehicle;
}

type SpecItem = { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; mono?: boolean };

function isElectricVehicle(vehicle: SerializedVehicle): boolean {
  const ft = (vehicle.fuelType ?? "").trim().toLowerCase();
  if (ft.includes("electric") || ft.includes("battery") || ft === "ev" || ft.includes("bev") || ft.includes("phev")) return true;
  if (vehicle.batteryCapacityKWh != null || vehicle.batteryChemistry || vehicle.chargingStandard) return true;
  return false;
}

function SpecGrid({ specs, className }: { specs: SpecItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6", className)}>
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

export function VehicleSpecs({ vehicle }: VehicleSpecsProps) {
  const optionalSpecs: SpecItem[] = [];
  if (vehicle.bodyStyle) optionalSpecs.push({ label: "Body Style", value: vehicle.bodyStyle, icon: Car });
  if (vehicle.fuelType) optionalSpecs.push({ label: "Fuel Type", value: vehicle.fuelType, icon: Fuel });
  if (vehicle.transmission) optionalSpecs.push({ label: "Transmission", value: vehicle.transmission, icon: Settings });
  if (vehicle.doors != null) optionalSpecs.push({ label: "Doors", value: String(vehicle.doors), icon: DoorOpen });

  const evSpecs: SpecItem[] = [];
  if (vehicle.batteryCapacityKWh != null) evSpecs.push({ label: "Battery Capacity", value: `${vehicle.batteryCapacityKWh} kWh`, icon: BatteryCharging });
  if (vehicle.batteryChemistry) evSpecs.push({ label: "Battery Chemistry", value: vehicle.batteryChemistry, icon: FlaskConical });
  if (vehicle.chargingStandard) evSpecs.push({ label: "Charging Standard", value: vehicle.chargingStandard, icon: Plug });

  const showEvSubsection = isElectricVehicle(vehicle) && evSpecs.length > 0;

  const before: SpecItem[] = [
    { label: "Year", value: vehicle.year, icon: Calendar },
    { label: "Mileage", value: `${vehicle.mileage.toLocaleString()} mi`, icon: Gauge },
    { label: "Drivetrain", value: DRIVETRAIN_LABELS[vehicle.drivetrain].replace(/ \(.*\)/, ''), icon: Zap },
    { label: "Range (Est)", value: vehicle.batteryRangeEstimate ? `${vehicle.batteryRangeEstimate} mi` : "N/A", icon: Battery },
  ];
  const after: SpecItem[] = [
    { label: "Exterior", value: vehicle.exteriorColor, icon: Paintbrush },
    { label: "Interior", value: vehicle.interiorColor, icon: Armchair },
    { label: "Condition", value: INVENTORY_CONDITION_LABELS[vehicle.condition], icon: Activity },
    { label: "Title Status", value: TITLE_STATUS_LABELS[vehicle.titleStatus], icon: FileText },
    { label: "VIN", value: vehicle.vin, icon: CheckCircle2, mono: true },
  ];
  const mainSpecs: SpecItem[] = [...before, ...optionalSpecs, ...after];

  return (
    <div className="space-y-0 py-8 border-y bg-muted/20 px-6 rounded-2xl">
      <SpecGrid specs={mainSpecs} className="pb-6" />
      {showEvSubsection && (
        <div className="pt-6 border-t border-border/60">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
            <BatteryCharging className="h-4 w-4 text-primary" />
            Electric Vehicle
          </h3>
          <SpecGrid specs={evSpecs} />
        </div>
      )}
    </div>
  );
}
