import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminInventory, getAdminInventoryCounts } from "@/lib/inventory";
import { AdminInventoryTable } from "@/components/admin/AdminInventoryTable";
import { Button } from "@/components/ui/button";
import { requireUserWithOrg } from "@/lib/auth";
import { serializeVehicle } from "@/lib/vehicle-serialization";

export default async function AdminInventoryPage() {
  const user = await requireUserWithOrg();

  // Direct server-side data fetching
  const vehicles = await getAdminInventory(user.organizationId);
  const statusCounts = await getAdminInventoryCounts(user.organizationId);

  // Serialize Decimal objects and Dates for Client Component serialization
  const serializedVehicles = serializeVehicle(vehicles);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage your vehicle showroom and inventory status.
          </p>
        </div>
        <Button asChild size="lg" className="shadow-sm">
          <Link href="/admin/inventory/new">
            <Plus className="mr-2 h-5 w-5" />
            Add Vehicle
          </Link>
        </Button>
      </div>

      <AdminInventoryTable 
        initialVehicles={serializedVehicles} 
        statusCounts={statusCounts}
      />
    </div>
  );
}
