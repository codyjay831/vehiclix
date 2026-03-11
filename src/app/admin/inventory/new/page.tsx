import * as React from "react";
import { VehicleForm } from "@/components/admin/VehicleForm";

export default function AdminNewVehiclePage() {
  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Vehicle</h1>
        <p className="text-muted-foreground mt-1">
          Create a new vehicle listing or save a draft to publish later.
        </p>
      </div>

      <VehicleForm />
    </div>
  );
}
