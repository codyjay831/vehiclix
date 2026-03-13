import { getFeaturedInventory } from "@/lib/inventory";
import { Hero } from "@/components/public/Hero";
import { FeaturedInventory } from "@/components/public/FeaturedInventory";
import { EducationSection } from "@/components/public/EducationSection";
import { getDefaultOrganization, getOrganizationById } from "@/lib/organization";

interface HomePageProps {
  searchParams: Promise<{ org?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { org: orgId } = await searchParams;
  const org = orgId ? await getOrganizationById(orgId) : await getDefaultOrganization();

  if (!org) {
    throw new Error("Organization not found");
  }

  const featuredVehicles = await getFeaturedInventory(org.id);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Hero />
        
        <FeaturedInventory vehicles={featuredVehicles} />
        
        <EducationSection />
      </main>
    </div>
  );
}
