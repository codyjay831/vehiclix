import Link from "next/link";
import { VehicleWithMedia } from "@/types";
import { InventoryCard } from "./InventoryCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface FeaturedInventoryProps {
  vehicles: VehicleWithMedia[];
}

export function FeaturedInventory({ vehicles }: FeaturedInventoryProps) {
  if (vehicles.length === 0) return null;

  return (
    <section className="py-24 bg-muted/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div className="space-y-4 max-w-xl">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">
              Featured Arrivals
            </h2>
            <h3 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-none italic">
              Curated <br />Showroom.
            </h3>
            <p className="text-muted-foreground font-medium text-lg">
              Explore our latest high-performance arrivals, each selected for its 
              exceptional condition and battery health.
            </p>
          </div>
          <Link href="/inventory">
            <Button variant="ghost" className="font-black uppercase tracking-widest text-xs group p-0 hover:bg-transparent">
              View All Inventory
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {vehicles.map((vehicle) => (
            <InventoryCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      </div>
    </section>
  );
}
