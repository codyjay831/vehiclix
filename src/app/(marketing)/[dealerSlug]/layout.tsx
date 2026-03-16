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

  // Suspended dealerships: show controlled message instead of storefront
  if (organization.status === "SUSPENDED") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md w-full rounded-2xl border-2 border-muted bg-card p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black uppercase tracking-tight">
            Temporarily unavailable
          </h1>
          <p className="mt-4 text-muted-foreground">
            This dealership&apos;s showroom is currently unavailable. Please check back later.
          </p>
        </div>
      </div>
    );
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
