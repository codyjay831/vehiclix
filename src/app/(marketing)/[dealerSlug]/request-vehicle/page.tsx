import * as React from "react";
import { Metadata } from "next";
import { VehicleRequestForm } from "@/components/public/VehicleRequestForm";
import { Search, Zap } from "lucide-react";
import { getOrganizationBySlug, getCanonicalUrl } from "@/lib/organization";
import { notFound } from "next/navigation";

interface RequestVehiclePageProps {
  params: Promise<{ dealerSlug: string }>;
}

export async function generateMetadata({ params }: RequestVehiclePageProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org) return { title: "Find Your EV" };

  const canonical = getCanonicalUrl(org, "/request-vehicle");

  return {
    title: `Find Your EV | ${org.name}`,
    description: `Can't find your dream electric vehicle? Let the sourcing specialists at ${org.name} find it for you.`,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      url: canonical,
    },
  };
}

export default async function RequestVehiclePage({ params }: RequestVehiclePageProps) {
  const { dealerSlug } = await params;
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org || org.branding?.publicSiteMode === "INVENTORY_ONLY") {
    return notFound();
  }

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pt-32 pb-20 px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center space-y-6 mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-black uppercase tracking-[0.2em]">
            <Search className="h-3 w-3" />
            Custom Vehicle Sourcing
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9] italic">
            Can't Find Your <br />
            <span className="text-primary">Dream EV?</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed">
            Tell us exactly what you're looking for. The team at {org.name} will search auction networks 
            and private collections to find the perfect electric vehicle for you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8 w-full max-w-3xl">
            {[
              { label: "Custom Sourcing", desc: "Any make, any model." },
              { label: "Expert Inspection", desc: "Verified battery health." },
              { label: "Fair Pricing", desc: "Transparent target deals." },
            ].map((benefit, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest">{benefit.label}</h4>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                  {benefit.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <VehicleRequestForm />
      </main>
    </div>
  );
}
