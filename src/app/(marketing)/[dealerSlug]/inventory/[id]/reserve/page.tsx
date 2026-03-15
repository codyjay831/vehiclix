import * as React from "react";
import { notFound } from "next/navigation";
import { getPublicVehicleDetail } from "@/lib/inventory";
import { getOrganizationBySlug, getCanonicalUrl } from "@/lib/organization";
import { ReservationClientPage } from "@/components/public/ReservationClientPage";
import { Metadata } from "next";

interface ReservationPageProps {
  params: Promise<{ dealerSlug: string; id: string }>;
}

export async function generateMetadata({ params }: ReservationPageProps): Promise<Metadata> {
  const { dealerSlug, id: vehicleId } = await params;
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org) return { title: "Reserve Vehicle" };

  const vehicle = await getPublicVehicleDetail(org.id, vehicleId);
  if (!vehicle) return { title: "Vehicle Not Found" };

  const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const canonical = getCanonicalUrl(org, `/inventory/${vehicleId}/reserve`);

  return {
    title: `Reserve ${vehicleName}`,
    description: `Secure your reservation for this ${vehicleName} at ${org.name}. Complete your deposit to start the purchase process.`,
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
  
  // 1. Resolve organization from slug
  const organization = await getOrganizationBySlug(dealerSlug);
  if (!organization) {
    return notFound();
  }

  // 2. Resolve vehicle with organization scope
  // This ensures the vehicle exists and belongs to this specific dealer
  const vehicle = await getPublicVehicleDetail(organization.id, vehicleId);

  // 3. Fail safely if vehicle is missing or doesn't belong to this dealer
  if (!vehicle) {
    return notFound();
  }

  // 4. Render the client-side form UI with trusted context
  return (
    <ReservationClientPage 
      vehicleId={vehicle.id} 
      dealerSlug={dealerSlug}
      organizationId={organization.id}
      organizationName={organization.name}
    />
  );
}
