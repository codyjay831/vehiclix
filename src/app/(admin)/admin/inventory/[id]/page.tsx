import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminVehicleDetail } from "@/lib/inventory";
import { requireUserWithOrg } from "@/lib/auth";
import {
  ChevronLeft,
  Edit,
  BarChart3,
  Eye,
  Share2,
  MessageSquare,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VehiclePhotosZipDownloadButton } from "@/components/admin/VehiclePhotosZipDownloadButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_STATUS_LABELS } from "@/types";
import { DistributionPanel } from "@/components/admin/DistributionPanel";
import { ListingWorkflowPanel } from "@/components/admin/ListingWorkflowPanel";
import { ListingCopyPanel } from "@/components/admin/ListingCopyPanel";
import { DeleteVehicleHeaderAction } from "@/components/admin/DeleteVehicleHeaderAction";
import { serializeVehicle } from "@/lib/vehicle-serialization";
import { computeVehicleReadiness } from "@/lib/vehicle-readiness";
import { cn } from "@/lib/utils";

interface AdminVehiclePageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminVehicleDetailPage({ params }: AdminVehiclePageProps) {
  const user = await requireUserWithOrg();
  const { id } = await params;
  const vehicle = await getAdminVehicleDetail(user.organizationId, id);

  if (!vehicle) {
    notFound();
  }

  // Serialize Decimal objects and Dates for Client Component serialization
  const serializedVehicle = serializeVehicle(vehicle);

  const inquiriesCount = vehicle._count?.inquiries || 0;
  const readiness = computeVehicleReadiness(serializedVehicle);
  const showReadiness = vehicle.vehicleStatus === "DRAFT" || vehicle.vehicleStatus === "UNPUBLISHED";

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:bg-transparent">
            <Link href="/admin/inventory">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Inventory
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <Badge variant={vehicle.vehicleStatus === "LISTED" ? "default" : "secondary"}>
              {VEHICLE_STATUS_LABELS[vehicle.vehicleStatus]}
            </Badge>
          </div>
          <p className="text-muted-foreground font-mono text-sm uppercase">
            VIN: {vehicle.vin}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button asChild variant="outline" className="w-full font-bold flex-1 md:flex-none">
            <Link href={`/admin/inventory/${vehicle.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </Link>
          </Button>
          {vehicle.media.some((m) => m.mediaType === "IMAGE") && (
            <VehiclePhotosZipDownloadButton
              vehicleId={vehicle.id}
              className="w-full flex-1 md:flex-none"
            />
          )}
          {vehicle.vehicleStatus === "LISTED" ? (
            <Button asChild className="w-full font-bold flex-1 md:flex-none">
              <a
                href={`/${vehicle.organization.slug}/inventory/${vehicle.slug ?? vehicle.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Public View
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled
              className="w-full font-bold flex-1 md:flex-none"
              title="Public view is available only after the vehicle is published (live on your site)."
            >
              <Eye className="mr-2 h-4 w-4" />
              Public View
            </Button>
          )}
          <div className="h-8 w-[1px] bg-border hidden md:block" />
          <DeleteVehicleHeaderAction vehicle={serializedVehicle} />
        </div>
      </div>

      {showReadiness && (
        <Card className={cn(
          "border-2",
          !readiness.isReadyForUnpublished ? "border-amber-200 bg-amber-50/30" : "border-blue-200 bg-blue-50/30"
        )}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 uppercase tracking-tight font-black">
              <AlertCircle className={cn(
                "h-5 w-5",
                !readiness.isReadyForUnpublished ? "text-amber-600" : "text-blue-600"
              )} />
              Listing Readiness
            </CardTitle>
            <CardDescription className="font-medium text-muted-foreground">
              {!readiness.isReadyForUnpublished 
                ? "This vehicle needs more information before it can be marked as unpublished."
                : !readiness.isReadyForPublished
                  ? "This vehicle is ready to be unpublished, but needs more information before it can go live."
                  : "This vehicle is ready to be published to your showroom."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(readiness.blockingUnpublished.length > 0 || readiness.blockingPublished.length > 0) && (
                <div className="space-y-3">
                  {readiness.blockingUnpublished.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-2">Required for Unpublished</p>
                      <ul className="space-y-1.5">
                        {readiness.blockingUnpublished.map((issue, i) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-amber-900">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {readiness.blockingPublished.length > 0 && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-700 mb-2">Required for Showroom</p>
                      <ul className="space-y-1.5">
                        {readiness.blockingPublished.map((issue, i) => (
                          <li key={i} className="text-sm flex items-start gap-2 text-blue-900">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {readiness.warnings.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Recommended for Quality</p>
                  <ul className="space-y-1.5">
                    {readiness.warnings.map((issue, i) => (
                      <li key={i} className="text-sm flex items-start gap-2 text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {readiness.isReadyForUnpublished && vehicle.vehicleStatus === "DRAFT" && (
                <div className="md:col-span-2 pt-2">
                  <Button asChild className="w-full md:w-auto font-bold">
                    <Link href={`/admin/inventory/${vehicle.id}/edit`}>
                      Complete Listing in Editor
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: Listing Status */}
          <ListingWorkflowPanel vehicle={serializedVehicle} />

          {/* Section 2: Create Listing Copy */}
          <ListingCopyPanel vehicle={serializedVehicle} />

          {/* Section 3: Share & Distribution */}
          <DistributionPanel vehicle={serializedVehicle} />

          {/* Vehicle Highlights / Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="uppercase tracking-tighter font-black flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Vehicle Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Price</p>
                  <p className="text-xl font-black">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(vehicle.price))}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Mileage</p>
                  <p className="text-xl font-black">{vehicle.mileage.toLocaleString()} mi</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Trim</p>
                  <p className="text-xl font-black">{vehicle.trim || "Base"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Title</p>
                  <p className="text-xl font-black">{vehicle.titleStatus}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest mb-2">Internal Notes</p>
                <p className="text-sm italic text-muted-foreground">
                  {vehicle.internalNotes || "No internal notes provided."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-8">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="uppercase tracking-tighter font-black flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                    <Eye className="h-4 w-4" />
                  </div>
                  <span className="font-bold uppercase text-sm">Total Views</span>
                </div>
                <span className="text-2xl font-black">{vehicle.views}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-green-100 text-green-600">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="font-bold uppercase text-sm">Inquiries</span>
                </div>
                <span className="text-2xl font-black">{inquiriesCount}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <span className="font-bold uppercase text-sm">Shares</span>
                </div>
                <span className="text-2xl font-black">{vehicle.shares}</span>
              </div>

              <div className="pt-2 text-center">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                  Engagement Rate: {vehicle.views > 0 ? ((inquiriesCount / vehicle.views) * 100).toFixed(1) : "0.0"}%
                </p>
              </div>
            </CardContent>
          </Card>

          {inquiriesCount > 0 && (
            <Button asChild className="w-full font-black uppercase tracking-tighter h-12">
              <Link href={`/admin/inquiries?vehicleId=${vehicle.id}`}>
                View All {inquiriesCount} Inquiries
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
