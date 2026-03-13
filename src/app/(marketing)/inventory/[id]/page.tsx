import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicVehicleDetail } from "@/lib/inventory";
import { getDefaultOrganization, getOrganizationById } from "@/lib/organization";
import { MediaGallery } from "@/components/public/MediaGallery";
import { VehicleSpecs } from "@/components/public/VehicleSpecs";
import { PricingPanel } from "@/components/public/PricingPanel";
import { VdpContent } from "@/components/public/VdpContent";
import { ChevronLeft, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackVehicleViewAction } from "@/actions/inventory";

interface VdpPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ org?: string }>;
}

export async function generateMetadata({ params, searchParams }: VdpPageProps): Promise<Metadata> {
  const { id } = await params;
  const { org: orgId } = await searchParams;
  const org = orgId ? await getOrganizationById(orgId) : await getDefaultOrganization();

  if (!org) {
    return {
      title: "Organization Not Found",
    };
  }

  const vehicle = await getPublicVehicleDetail(org.id, id);

  if (!vehicle) {
    return {
      title: "Vehicle Not Found",
    };
  }

  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ""}`;
  const description = vehicle.description?.slice(0, 160) || `View details for this certified ${vehicle.make} ${vehicle.model} electric vehicle.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: vehicle.media[0] ? [vehicle.media[0].url] : [],
    },
  };
}

export default async function VdpPage({ params, searchParams }: VdpPageProps) {
  const { id } = await params;
  const { org: orgId } = await searchParams;
  const org = orgId ? await getOrganizationById(orgId) : await getDefaultOrganization();

  if (!org) {
    return notFound();
  }

  const vehicle = await getPublicVehicleDetail(org.id, id);

  if (!vehicle) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="bg-destructive/10 p-6 rounded-full">
          <Home className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">
            No Longer Available
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-md mx-auto">
            The certified electric vehicle you're looking for has either been reserved, sold, or unlisted.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-8">
          <Link href="/inventory">
            <Button size="lg" className="rounded-full px-8 h-14 font-black shadow-lg">
              <ChevronLeft className="mr-2 h-5 w-5" />
              Return to Showroom
            </Button>
          </Link>
          <Link href="/request-vehicle">
            <Button variant="outline" size="lg" className="rounded-full px-8 h-14 font-black border-2 hover:bg-muted group">
              Find My EV
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Track the view
  await trackVehicleViewAction(vehicle.id);

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 animate-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <Link href="/inventory">
            <Button variant="ghost" size="sm" className="pl-0 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-transparent hover:text-primary transition-colors">
              <ChevronLeft className="mr-1 h-3 w-3" />
              Back to Inventory
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none uppercase">
              {vehicle.year} {vehicle.make} <br />
              <span className="text-primary">{vehicle.model}</span>
            </h1>
            {vehicle.trim && (
              <p className="text-xl font-black text-muted-foreground uppercase tracking-widest">
                {vehicle.trim}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column (60%) */}
        <div className="lg:col-span-8 space-y-12 animate-in slide-in-from-left-4 duration-500">
          <MediaGallery media={vehicle.media} />
          <VehicleSpecs vehicle={vehicle} />
          <VdpContent vehicle={vehicle} />
        </div>

        {/* Right Column (40%) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 animate-in slide-in-from-right-4 duration-500">
          <PricingPanel vehicle={vehicle} />
        </div>
      </div>
    </div>
  );
}
