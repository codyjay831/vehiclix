import {
  serializeStorefrontVehicles,
  fetchStorefrontPublicCatalog,
  getCachedStorefrontPublicDealer,
  deriveMakesFromCatalogItems,
  mapCatalogItemsForStorefrontGrid,
} from "@/lib/api/storefront-public";
import { InventoryGrid } from "@/components/public/InventoryGrid";
import { InventoryFilters } from "@/components/public/InventoryFilters";
import { Metadata } from "next";
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
  const dealer = await getCachedStorefrontPublicDealer(dealerSlug);

  if (!dealer) return { title: "Showroom" };

  const dealerName = dealer.name;
  const base = dealer.canonicalBaseUrl.replace(/\/$/, "");
  const canonical = `${base}/inventory`;

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

  const dealer = await getCachedStorefrontPublicDealer(dealerSlug);

  if (!dealer) {
    return notFound();
  }

  const catalogQuery = {
    make: filtersParams.make,
    maxPrice: filtersParams.maxPrice,
    minYear: filtersParams.minYear,
    sort: filtersParams.sort,
    search: filtersParams.search,
  };

  const [allCatalogItems, filteredItems] = await Promise.all([
    fetchStorefrontPublicCatalog(dealerSlug, {}),
    fetchStorefrontPublicCatalog(dealerSlug, catalogQuery),
  ]);

  const makes = deriveMakesFromCatalogItems(allCatalogItems);
  const gridVehicles = mapCatalogItemsForStorefrontGrid(filteredItems);
  const serializedVehicles = serializeStorefrontVehicles(gridVehicles);

  const hasFilters = Object.values(filtersParams).some(Boolean);

  const nameParts = dealer.name.split(" ");
  const firstPart = nameParts[0];
  const restPart = nameParts.slice(1).join(" ");

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
        totalCount={filteredItems.length}
        hasFilters={hasFilters}
      />
    </div>
  );
}
