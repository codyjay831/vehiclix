import * as React from "react";
import { notFound } from "next/navigation";
import {
  getCachedStorefrontPublicDealer,
  getCachedStorefrontPublicVehicleDetail,
} from "@/lib/api/storefront-public";
import { ReservationClientPage } from "@/components/public/ReservationClientPage";
import { Metadata } from "next";

interface ReservationPageProps {
  params: Promise<{ dealerSlug: string; id: string }>;
}

function canonicalPathForReserve(dealerCanonicalBase: string, routeIdSegment: string): string {
  const base = dealerCanonicalBase.replace(/\/$/, "");
  return `${base}/inventory/${routeIdSegment}/reserve`;
}

export async function generateMetadata({ params }: ReservationPageProps): Promise<Metadata> {
  const { dealerSlug, id: vehicleId } = await params;
  const dealer = await getCachedStorefrontPublicDealer(dealerSlug);

  if (!dealer) return { title: "Reserve Vehicle" };

  const dto = await getCachedStorefrontPublicVehicleDetail(dealerSlug, vehicleId);
  if (!dto) return { title: "Vehicle Not Found" };

  const vehicleName = `${dto.year} ${dto.make} ${dto.model}`;
  const canonical = canonicalPathForReserve(dealer.canonicalBaseUrl, vehicleId);

  return {
    title: `Reserve ${vehicleName}`,
    description: `Secure your reservation for this ${vehicleName} at ${dealer.name}. Complete your deposit to start the purchase process.`,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      url: canonical,
    },
  };
}

export default async function ReservationPage({ params }: ReservationPageProps) {
  const { dealerSlug, id: vehicleId } = await params;

  const dealer = await getCachedStorefrontPublicDealer(dealerSlug);
  if (!dealer) {
    return notFound();
  }

  const dto = await getCachedStorefrontPublicVehicleDetail(dealerSlug, vehicleId);

  if (!dto) {
    return notFound();
  }

  return (
    <ReservationClientPage
      vehicleId={dto.id}
      vehicleSlug={dto.slug}
      dealerSlug={dealerSlug}
      organizationName={dealer.name}
    />
  );
}
