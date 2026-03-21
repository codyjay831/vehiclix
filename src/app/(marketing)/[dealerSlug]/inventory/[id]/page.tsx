import * as React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCachedStorefrontPublicDealer,
  getCachedStorefrontPublicVehicleDetail,
  mapPublicVehicleDetailDtoForStorefrontVdp,
  serializeStorefrontVdpVehicle,
} from "@/lib/api/storefront-public";
import { serializeDecimal } from "@/lib/serializers";
import type { VehicleMedia } from "@prisma/client";
import { MediaGallery } from "@/components/public/MediaGallery";
import { VehicleSpecChips } from "@/components/public/VehicleSpecChips";
import { VehicleSpecs } from "@/components/public/VehicleSpecs";
import { PricingPanel } from "@/components/public/PricingPanel";
import { VdpContent } from "@/components/public/VdpContent";
import { ChevronLeft, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackVehicleViewAction } from "@/actions/inventory";

interface VdpPageProps {
  params: Promise<{ dealerSlug: string; id: string }>;
}

function canonicalPathForVdp(dealerCanonicalBase: string, routeIdSegment: string): string {
  const base = dealerCanonicalBase.replace(/\/$/, "");
  return `${base}/inventory/${routeIdSegment}`;
}

export async function generateMetadata({ params }: VdpPageProps): Promise<Metadata> {
  const { dealerSlug, id } = await params;

  const dealer = await getCachedStorefrontPublicDealer(dealerSlug);

  if (!dealer) {
    return {
      title: "Organization Not Found",
    };
  }

  const dto = await getCachedStorefrontPublicVehicleDetail(dealerSlug, id);

  if (!dto) {
    return {
      title: "Vehicle Not Found",
    };
  }

  const dealerName = dealer.name;
  const vehicleName = `${dto.year} ${dto.make} ${dto.model} ${dto.trim || ""}`;
  const description =
    dto.description?.slice(0, 160) ||
    `View details for this certified ${dto.make} ${dto.model} electric vehicle at ${dealerName}.`;
  const canonical = canonicalPathForVdp(dealer.canonicalBaseUrl, id);

  return {
    title: vehicleName,
    description,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      title: `${vehicleName} | ${dealerName}`,
      description,
      url: canonical,
      images: dto.heroImage ? [dto.heroImage] : dto.images[0] ? [dto.images[0]] : [],
    },
  };
}

export default async function VdpPage({ params }: VdpPageProps) {
  const { dealerSlug, id } = await params;

  const dealer = await getCachedStorefrontPublicDealer(dealerSlug);

  if (!dealer) {
    return notFound();
  }

  const dto = await getCachedStorefrontPublicVehicleDetail(dealerSlug, id);

  if (!dto) {
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
            The certified electric vehicle you're looking for has either been reserved, sold, or unlisted at{" "}
            {dealer.name}.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 pt-8">
          <Link href={`/${dealer.slug}/inventory`}>
            <Button size="lg" className="rounded-full px-8 h-14 font-black shadow-lg">
              <ChevronLeft className="mr-2 h-5 w-5" />
              Return to Showroom
            </Button>
          </Link>
          <Link href={`/${dealer.slug}/request-vehicle`}>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full px-8 h-14 font-black border-2 hover:bg-muted group"
            >
              Find My EV
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  await trackVehicleViewAction(dto.id, dealer.id);

  const { media, serializedVehicle } = mapPublicVehicleDetailDtoForStorefrontVdp(dto);
  const serializedVehiclePlain = serializeStorefrontVdpVehicle(serializedVehicle);

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 animate-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-4">
          <Link href={`/${dealer.slug}/inventory`}>
            <Button
              variant="ghost"
              size="sm"
              className="pl-0 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:bg-transparent hover:text-primary transition-colors"
            >
              <ChevronLeft className="mr-1 h-3 w-3" />
              Back to Inventory
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none uppercase">
              {dto.year} {dto.make} <br />
              <span className="text-primary">{dto.model}</span>
            </h1>
            {dto.trim && (
              <p className="text-xl font-black text-muted-foreground uppercase tracking-widest">{dto.trim}</p>
            )}
          </div>
        </div>
        <VehicleSpecChips vehicle={serializedVehiclePlain} className="mt-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column (60%) */}
        <div className="lg:col-span-8 space-y-12 animate-in slide-in-from-left-4 duration-500">
          <MediaGallery media={serializeDecimal(media) as VehicleMedia[]} />
          <VehicleSpecs vehicle={serializedVehiclePlain} />
          <VdpContent vehicle={serializedVehiclePlain} />
        </div>

        {/* Right Column (40%) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 animate-in slide-in-from-right-4 duration-500">
          <PricingPanel vehicle={serializedVehiclePlain} />
        </div>
      </div>
    </div>
  );
}
