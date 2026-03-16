import { getPublicInventory, getPublicMakes } from "@/lib/inventory";
import { serializeDecimal } from "@/lib/serializers";
import { InventoryGrid } from "@/components/public/InventoryGrid";
import { InventoryFilters } from "@/components/public/InventoryFilters";
import { Metadata } from "next";
import { getOrganizationBySlug, getCanonicalUrl } from "@/lib/organization";
import { notFound } from "next/navigation";

interface InventoryPageProps {
  params: Promise<{ dealerSlug: string }>;
  searchParams: Promise<{
    make?: string;
    maxPrice?: string;
    minYear?: string;
    sort?: string;
    search?: string;
  }>;
}

export async function generateMetadata({ params }: InventoryPageProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org) return { title: "Showroom" };

  const dealerName = org.name;
  const canonical = getCanonicalUrl(org, "/inventory");

  return {
    title: "Showroom",
    description: `Browse the curated selection of premium electric vehicles at ${dealerName}.`,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      url: canonical,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function InventoryPage({ params, searchParams }: InventoryPageProps) {
  const { dealerSlug } = await params;
  const filtersParams = await searchParams;
  
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org) {
    return notFound();
  }

  const filters = {
    make: filtersParams.make,
    maxPrice: filtersParams.maxPrice ? parseFloat(filtersParams.maxPrice) : undefined,
    minYear: filtersParams.minYear ? parseInt(filtersParams.minYear) : undefined,
    sort: filtersParams.sort,
    search: filtersParams.search,
  };

  const [vehicles, makes] = await Promise.all([
    getPublicInventory(org.id, filters),
    getPublicMakes(org.id),
  ]);

  const serializedVehicles = serializeDecimal(vehicles);

  const hasFilters = Object.values(filtersParams).some(Boolean);

  const nameParts = org.name.split(' ');
  const firstPart = nameParts[0];
  const restPart = nameParts.slice(1).join(' ');

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col space-y-4 mb-12 text-center md:text-left">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none uppercase">
          {firstPart} <span className="text-primary">{restPart}</span> Showroom
        </h1>
        <p className="text-lg text-muted-foreground font-medium max-w-2xl">
          A highly-curated selection of high-performance, boutique electric vehicles. 
          Ready for immediate reservation.
        </p>
      </div>

      <InventoryFilters makes={makes} />
      
      <InventoryGrid 
        vehicles={serializedVehicles} 
        totalCount={vehicles.length} 
        hasFilters={hasFilters}
      />
    </div>
  );
}
