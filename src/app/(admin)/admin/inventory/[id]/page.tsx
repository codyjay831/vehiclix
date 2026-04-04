import * as React from "react";
import { notFound, redirect } from "next/navigation";
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
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VEHICLE_STATUS_LABELS } from "@/types";
import { DistributionPanel } from "@/components/admin/DistributionPanel";

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

  // Serialize Decimal objects for Client Component serialization
  const serializedVehicle = {
    ...vehicle,
    price: Number(vehicle.price)
  };

  const inquiriesCount = vehicle._count?.inquiries || 0;

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
          {vehicle.media.length > 0 && (
            <Button asChild variant="secondary" className="w-full font-bold flex-1 md:flex-none">
              <a href={`/api/admin/inventory/${vehicle.id}/photos-zip`} download>
                <Download className="mr-2 h-4 w-4" />
                Download Optimized Photos
              </a>
            </Button>
          )}
          <Button asChild className="w-full font-bold flex-1 md:flex-none">
            <a href={`/${vehicle.organization.slug}/inventory/${vehicle.id}`} target="_blank">
              <Eye className="mr-2 h-4 w-4" />
              Public View
            </a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Distribution Panel */}
          <DistributionPanel vehicle={serializedVehicle as any} />

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
