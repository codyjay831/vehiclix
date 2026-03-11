import { getFeaturedInventory } from "@/lib/inventory";
import { Hero } from "@/components/public/Hero";
import { FeaturedInventory } from "@/components/public/FeaturedInventory";
import { EducationSection } from "@/components/public/EducationSection";
import { Footer } from "@/components/public/Footer";

export default async function HomePage() {
  const featuredVehicles = await getFeaturedInventory();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        <Hero />
        
        <FeaturedInventory vehicles={featuredVehicles} />
        
        <EducationSection />
      </main>

      <Footer />
    </div>
  );
}
