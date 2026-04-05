"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VehicleStatus, VEHICLE_STATUS_LABELS } from "@/types";
import { SerializedVehicleWithMedia } from "@/lib/vehicle-serialization";
import { 
  CheckCircle2, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  AlertCircle,
  ArrowRight,
  Loader2
} from "lucide-react";
import { updateVehicleStatusAction } from "@/actions/inventory";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { computeVehicleReadiness } from "@/lib/vehicle-readiness";

interface ListingWorkflowPanelProps {
  vehicle: SerializedVehicleWithMedia;
}

export function ListingWorkflowPanel({ vehicle }: ListingWorkflowPanelProps) {
  const [isPending, startTransition] = React.useTransition();
  const readiness = computeVehicleReadiness(vehicle);

  const handleStatusChange = (newStatus: VehicleStatus) => {
    startTransition(async () => {
      try {
        await updateVehicleStatusAction(vehicle.id, newStatus);
        toast.success(`Vehicle status updated to ${VEHICLE_STATUS_LABELS[newStatus]}`);
      } catch (error: any) {
        toast.error(error.message || "Failed to update status");
      }
    });
  };

  const getStatusDescription = () => {
    switch (vehicle.vehicleStatus) {
      case "DRAFT":
        return "This vehicle is currently a draft and is not visible to anyone but staff.";
      case "UNPUBLISHED":
        return "This vehicle is unpublished and ready for review, but not yet live on your public showroom.";
      case "LISTED":
        return "This vehicle is live on your public showroom and available for customers to view and reserve.";
      case "RESERVED":
        return "A customer has placed a deposit on this vehicle. It is currently held.";
      case "SOLD":
        return "This vehicle has been marked as sold.";
      case "ARCHIVED":
        return "This vehicle is archived and hidden from all public views.";
      default:
        return "";
    }
  };

  return (
    <Card className="border-2 border-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="uppercase tracking-tighter font-black flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Listing Status
            </CardTitle>
            <CardDescription className="font-medium">
              {getStatusDescription()}
            </CardDescription>
          </div>
          <Badge 
            variant={vehicle.vehicleStatus === "LISTED" ? "default" : "secondary"}
            className="uppercase font-black px-3 py-1 text-xs tracking-widest"
          >
            {VEHICLE_STATUS_LABELS[vehicle.vehicleStatus]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {/* Primary Action */}
          {vehicle.vehicleStatus === "DRAFT" && (
            <Button 
              disabled={!readiness.isReadyForUnpublished || isPending}
              onClick={() => handleStatusChange("UNPUBLISHED")}
              className="font-bold"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Move to Unpublished
            </Button>
          )}

          {vehicle.vehicleStatus === "UNPUBLISHED" && (
            <Button 
              disabled={!readiness.isReadyForPublished || isPending}
              onClick={() => handleStatusChange("LISTED")}
              className="font-bold"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Publish to Showroom
            </Button>
          )}

          {/* Secondary Actions */}
          {vehicle.vehicleStatus === "LISTED" && (
            <>
              <Button 
                variant="outline" 
                onClick={() => handleStatusChange("SOLD")}
                disabled={isPending}
                className="font-bold border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Mark as Sold
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleStatusChange("ARCHIVED")}
                disabled={isPending}
                className="font-bold"
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <EyeOff className="mr-2 h-4 w-4" />}
                Unpublish & Archive
              </Button>
            </>
          )}

          {vehicle.vehicleStatus === "UNPUBLISHED" && (
            <Button 
              variant="ghost" 
              onClick={() => handleStatusChange("DRAFT")}
              disabled={isPending}
              className="font-bold text-muted-foreground"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Demote to Draft
            </Button>
          )}

          {vehicle.vehicleStatus === "ARCHIVED" && (
            <Button 
              variant="outline" 
              onClick={() => handleStatusChange("UNPUBLISHED")}
              disabled={isPending}
              className="font-bold"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Restore to Unpublished
            </Button>
          )}
        </div>

        {!readiness.isReadyForUnpublished && vehicle.vehicleStatus === "DRAFT" && (
          <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-100 flex items-start gap-2 text-amber-800 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Vehicle is missing required details for staging. Check the readiness checklist above.</p>
          </div>
        )}

        {readiness.isReadyForUnpublished && !readiness.isReadyForPublished && vehicle.vehicleStatus === "UNPUBLISHED" && (
          <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-100 flex items-start gap-2 text-blue-800 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
            <p>Vehicle is ready for review but needs more details before it can be published live.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
