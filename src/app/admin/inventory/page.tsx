import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminInventory } from "@/lib/inventory";
import { AdminInventoryTable } from "@/components/admin/AdminInventoryTable";
import { Button } from "@/components/ui/button";

export default async function AdminInventoryPage() {
  // Direct server-side data fetching
  const vehicles = await getAdminInventory();

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage your vehicle showroom and inventory status.
          </p>
        </div>
        <Link href="/admin/inventory/new">
          <Button size="lg" className="shadow-sm">
            <Plus className="mr-2 h-5 w-5" />
            Add Vehicle
          </Button>
        </Link>
      </div>

      <AdminInventoryTable initialVehicles={vehicles} />
    </div>
  );
}
