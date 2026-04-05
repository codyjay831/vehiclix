import { notFound } from "next/navigation";
import {
  getCachedStorefrontPublicDealer,
  dealerDtoToTenantBrandingHomepage,
} from "@/lib/api/storefront-public";
import { TenantProvider } from "@/components/providers/TenantProvider";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { getAuthenticatedUser } from "@/lib/auth";
import { Metadata } from "next";

interface DealerLayoutProps {
  children: React.ReactNode;
  params: Promise<{ dealerSlug: string }>;
}

/**
 * Generates dealer-specific metadata template.
 * This overrides the root "Vehiclix" template for all dealer sub-pages.
 */
export async function generateMetadata({ params }: DealerLayoutProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const dealer = await getCachedStorefrontPublicDealer(dealerSlug);

  if (!dealer) {
    return {};
  }

  const dealerName = dealer.name;
  const canonical = dealer.canonicalBaseUrl;

  return {
    title: {
      template: `%s | ${dealerName}`,
      default: dealerName,
    },
    description: `Official showroom of ${dealerName}. Premium electric vehicle inventory.`,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      url: canonical,
      siteName: dealerName,
    },
  };
}

export default async function DealerLayout({
  children,
  params,
}: DealerLayoutProps) {
  const { dealerSlug } = await params;

  const dealer = await getCachedStorefrontPublicDealer(dealerSlug);

  if (!dealer) {
    return notFound();
  }

  const user = await getAuthenticatedUser();
  const userRole = user?.role || null;

  const { branding, homepage } = dealerDtoToTenantBrandingHomepage(dealer);

  // Guard: Fully Disabled mode blocks all public routes under this slug
  if (branding?.publicSiteMode === "DISABLED") {
    return notFound();
  }

  const tenant = {
    id: dealer.id,
    name: dealer.name,
    slug: dealer.slug,
    phone: dealer.phone,
    branding,
    homepage,
  };

  return (
    <TenantProvider tenant={tenant}>
      <div className="flex flex-col min-h-screen">
        <Navbar userRole={userRole} />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </TenantProvider>
  );
}
