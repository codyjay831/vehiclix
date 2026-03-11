import * as React from "react";
import { notFound, redirect } from "next/navigation";
import { getVehicleForEdit } from "@/lib/inventory";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { VehicleStatus } from "@prisma/client";

interface EditVehiclePageProps {
  params: Promise<{ id: string }>;
}

const LOCKED_STATUSES: VehicleStatus[] = ["RESERVED", "UNDER_CONTRACT", "SOLD"];

export default async function AdminEditVehiclePage({ params }: EditVehiclePageProps) {
  const { id } = await params;
  const vehicle = await getVehicleForEdit(id);

  if (!vehicle) {
    notFound();
  }

  if (LOCKED_STATUSES.includes(vehicle.vehicleStatus)) {
    // Redirect with error info (though layout doesn't catch query params for toast yet,
    // this prevents direct access to editing locked records).
    redirect("/admin/inventory?error=locked");
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Vehicle</h1>
        <p className="text-muted-foreground mt-1">
          Update specifications, pricing, and internal notes for this {vehicle.year} {vehicle.make} {vehicle.model}.
        </p>
      </div>

      <VehicleForm initialData={vehicle} isEdit={true} />
    </div>
  );
}
