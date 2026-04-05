import { serializeStorefrontVehicles, fetchStorefrontPublicCatalog, getCachedStorefrontPublicDealer, dealerDtoToTenantBrandingHomepage, mapCatalogItemsForStorefrontGrid } from "@/lib/api/storefront-public";
import { Hero } from "@/components/public/Hero";
import { PromoBar } from "@/components/public/PromoBar";
import { TrustHighlights } from "@/components/public/TrustHighlights";
import { FeaturedInventory } from "@/components/public/FeaturedInventory";
import { Testimonial } from "@/components/public/Testimonial";
import { AboutTeaser } from "@/components/public/AboutTeaser";
import { ContactCTA } from "@/components/public/ContactCTA";
import { getSafeHomepage } from "@/lib/homepage";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";

interface DealerHomePageProps {
  params: Promise<{ dealerSlug: string }>;
}

/**
 * Generates dealer-specific metadata for the home page.
 */
export async function generateMetadata({ params }: DealerHomePageProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const dealer = await getCachedStorefrontPublicDealer(dealerSlug);

  if (!dealer) {
    return {
      title: "Dealer Not Found",
    };
  }

  const { branding, homepage } = dealerDtoToTenantBrandingHomepage(dealer);

  // Guard: Inventory Only mode redirects visitors to the inventory page
  const siteMode = branding?.publicSiteMode || "FULL_STOREFRONT";
  if (siteMode === "INVENTORY_ONLY") {
    redirect(`/${dealerSlug}/inventory`);
  }

  const safeHome = getSafeHomepage(homepage, branding, dealer.name);
  const dealerName = dealer.name;
  const canonical = dealer.canonicalBaseUrl;

  return {
    title: "Home",
    description: safeHome.heroSubheadline || `Welcome to ${dealerName}. Browse our inventory, explore vehicle details, and get in touch.`,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      title: safeHome.heroHeadline || dealerName,
      description: safeHome.heroSubheadline || `Browse the inventory at ${dealerName}.`,
      url: canonical,
      type: "website",
    },
  };
}

export default async function DealerHomePage({ params }: DealerHomePageProps) {
  const { dealerSlug } = await params;

  const dealer = await getCachedStorefrontPublicDealer(dealerSlug);

  if (!dealer) {
    return notFound();
  }

  // Guard: Inventory Only mode redirects visitors to the inventory page
  const siteMode = dealer.branding?.publicSiteMode || "FULL_STOREFRONT";
  if (siteMode === "INVENTORY_ONLY") {
    redirect(`/${dealerSlug}/inventory`);
  }

  const catalogItems = await fetchStorefrontPublicCatalog(dealerSlug, {});
  const gridVehicles = mapCatalogItemsForStorefrontGrid(catalogItems);
  const serializedVehicles = serializeStorefrontVehicles(gridVehicles);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <PromoBar />
        <Hero />
        <TrustHighlights />
        <FeaturedInventory vehicles={serializedVehicles} />
        <Testimonial />
        <AboutTeaser />
        <ContactCTA />
      </main>
    </div>
  );
}
