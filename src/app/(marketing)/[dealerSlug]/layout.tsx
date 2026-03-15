import { notFound } from "next/navigation";
import { getOrganizationBySlug, getCanonicalUrl } from "@/lib/organization";
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
  const organization = await getOrganizationBySlug(dealerSlug);

  if (!organization) {
    return {};
  }

  const dealerName = organization.name;
  const canonical = getCanonicalUrl(organization);

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
  
  const organization = await getOrganizationBySlug(dealerSlug);

  if (!organization) {
    return notFound();
  }

  const user = await getAuthenticatedUser();
  const userRole = user?.role || null;

  // Minimum safe tenant context for public display
  const tenant = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    phone: organization.phone,
    branding: organization.branding,
    homepage: organization.homepage,
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
