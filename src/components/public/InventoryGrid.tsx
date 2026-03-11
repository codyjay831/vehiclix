import { VehicleWithMedia } from "@/types";
import { InventoryCard } from "./InventoryCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CarFront, ArrowRight } from "lucide-react";

interface InventoryGridProps {
  vehicles: VehicleWithMedia[];
  totalCount: number;
  hasFilters: boolean;
}

export function InventoryGrid({ vehicles, totalCount, hasFilters }: InventoryGridProps) {
  if (totalCount === 0 && !hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 max-w-md mx-auto">
        <div className="bg-muted p-6 rounded-full">
          <CarFront className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight">Our inventory is being updated.</h3>
          <p className="text-muted-foreground">
            Check back soon or tell us what you're looking for, and our team will search our network to find it for you.
          </p>
        </div>
        <Link href="/request-vehicle">
          <Button size="lg" className="rounded-full shadow-lg group">
            Request a Vehicle
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    );
  }

  if (vehicles.length === 0 && hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <h3 className="text-xl font-bold">No vehicles match your filters.</h3>
        <p className="text-muted-foreground">Try clearing some filters or adjust your search criteria.</p>
        <Link href="/inventory">
          <Button variant="outline" className="rounded-full">
            Clear all filters
          </Button>
        </Link>
        <p className="text-sm text-muted-foreground pt-4">
          Can't find what you need?{" "}
          <Link href="/request-vehicle" className="text-primary hover:underline font-bold">
            Request a Vehicle
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-1">
        <p className="text-sm text-muted-foreground font-medium">
          Showing <span className="font-bold text-foreground">{vehicles.length}</span>{" "}
          {vehicles.length === 1 ? "vehicle" : "vehicles"}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
        {vehicles.map((vehicle) => (
          <InventoryCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
    </div>
  );
}
