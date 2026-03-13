import * as React from "react";
import { getPublicInventory, getPublicMakes } from "@/lib/inventory";
import { InventoryGrid } from "@/components/public/InventoryGrid";
import { InventoryFilters } from "@/components/public/InventoryFilters";
import { Metadata } from "next";
import { getDefaultOrganization, getOrganizationById } from "@/lib/organization";

export const metadata: Metadata = {
  title: "Inventory",
  description: "Browse our curated selection of premium electric vehicles.",
};

export const dynamic = "force-dynamic";

import { BRANDING } from "@/config/branding";

interface InventoryPageProps {
  searchParams: Promise<{
    make?: string;
    maxPrice?: string;
    minYear?: string;
    sort?: string;
    search?: string;
    org?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  
  const filters = {
    make: params.make,
    maxPrice: params.maxPrice ? parseFloat(params.maxPrice) : undefined,
    minYear: params.minYear ? parseInt(params.minYear) : undefined,
    sort: params.sort,
    search: params.search,
  };

  const orgId = params.org;
  const org = orgId ? await getOrganizationById(orgId) : await getDefaultOrganization();

  if (!org) {
    throw new Error("Organization not found");
  }

  const [vehicles, makes] = await Promise.all([
    getPublicInventory(org.id, filters),
    getPublicMakes(org.id),
  ]);

  const hasFilters = Object.values(params).some(Boolean);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col space-y-4 mb-12 text-center md:text-left">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none uppercase">
          {BRANDING.companyName.split(' ')[0]} Showroom
        </h1>
        <p className="text-lg text-muted-foreground font-medium max-w-2xl">
          A highly-curated selection of high-performance, boutique electric vehicles. 
          Ready for immediate reservation.
        </p>
      </div>

      <InventoryFilters makes={makes} />
      
      <InventoryGrid 
        vehicles={vehicles} 
        totalCount={vehicles.length} 
        hasFilters={hasFilters}
      />
    </div>
  );
}
