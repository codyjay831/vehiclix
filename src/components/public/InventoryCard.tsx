"use client";

import Link from "next/link";
import { SerializedVehicleWithMedia, DRIVETRAIN_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useTenant } from "@/components/providers/TenantProvider";
import { vehicleMediaCardUrl } from "@/lib/vehicle-media-display";

interface InventoryCardProps {
  vehicle: SerializedVehicleWithMedia;
}

export function InventoryCard({ vehicle }: InventoryCardProps) {
  const tenant = useTenant();
  const first = vehicle.media[0];
  const primaryImage = first ? vehicleMediaCardUrl(first) : undefined;

  return (
    <Card className="overflow-hidden border-0 shadow-none bg-background group">
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-muted">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground italic text-sm">
            Image coming soon
          </div>
        )}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-background/80 backdrop-blur-md text-xs font-medium">
            {DRIVETRAIN_LABELS[vehicle.drivetrain].replace(/ \(.*\)/, '')}
          </Badge>
        </div>
      </div>
      
      <CardContent className="px-0 py-4 space-y-1">
        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col">
            <h3 className="text-lg font-bold tracking-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            {vehicle.trim && (
              <p className="text-sm text-muted-foreground">{vehicle.trim}</p>
            )}
          </div>
          <div className="text-xl font-black tabular-nums">
            {vehicle.pricingMode === "LIST_PRICE" ? (
              new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(Number(vehicle.price))
            ) : vehicle.pricingMode === "PRICE_ON_REQUEST" ? (
              <span className="text-sm uppercase tracking-widest text-primary">Price on Request</span>
            ) : vehicle.pricingMode === "CALL_FOR_PRICE" ? (
              <span className="text-sm uppercase tracking-widest text-primary">Call for Price</span>
            ) : null}
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-muted-foreground pt-1">
          <span>{vehicle.mileage.toLocaleString()} mi</span>
          {vehicle.batteryRangeEstimate && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>{vehicle.batteryRangeEstimate} mi range</span>
            </>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="px-0 pb-2">
        <Link href={tenant ? `/${tenant.slug}/inventory/${vehicle.id}` : `/inventory/${vehicle.id}`} className="w-full">
          <Button variant="outline" className="w-full rounded-full border-2 hover:bg-primary hover:text-primary-foreground transition-all">
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
