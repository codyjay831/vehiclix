import { getFeaturedInventory } from "@/lib/inventory";
import { serializeDecimal } from "@/lib/serializers";
import { Hero } from "@/components/public/Hero";
import { PromoBar } from "@/components/public/PromoBar";
import { TrustHighlights } from "@/components/public/TrustHighlights";
import { FeaturedInventory } from "@/components/public/FeaturedInventory";
import { Testimonial } from "@/components/public/Testimonial";
import { AboutTeaser } from "@/components/public/AboutTeaser";
import { ContactCTA } from "@/components/public/ContactCTA";
import { getOrganizationBySlug, getCanonicalUrl } from "@/lib/organization";
import { getSafeHomepage } from "@/lib/homepage";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface DealerHomePageProps {
  params: Promise<{ dealerSlug: string }>;
}

/**
 * Generates dealer-specific metadata for the home page.
 */
export async function generateMetadata({ params }: DealerHomePageProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org) {
    return {
      title: "Dealer Not Found",
    };
  }

  const homepage = getSafeHomepage(org.homepage, org.branding, org.name);
  const dealerName = org.name;
  const canonical = getCanonicalUrl(org);

  return {
    title: "Home",
    description: homepage.heroSubheadline || `Welcome to ${dealerName}. Explore our curated selection of premium electric vehicles and discover our commitment to the future of mobility.`,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      title: homepage.heroHeadline || `${dealerName} | Boutique EV Showroom`,
      description: homepage.heroSubheadline || `Boutique electric vehicle dealership. Explore curated EVs at ${dealerName}.`,
      url: canonical,
      type: "website",
    },
  };
}

export default async function DealerHomePage({ params }: DealerHomePageProps) {
  const { dealerSlug } = await params;
  
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org) {
    return notFound();
  }

  const featuredVehicles = await getFeaturedInventory(org.id);
  const serializedVehicles = serializeDecimal(featuredVehicles);

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
