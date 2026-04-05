import * as React from "react";
import { SerializedVehicle } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Zap } from "lucide-react";

interface VdpContentProps {
  vehicle: SerializedVehicle;
}

export function VdpContent({ vehicle }: VdpContentProps) {
  return (
    <div className="space-y-12">
      {/* Description */}
      {vehicle.description && (
        <section className="space-y-4">
          <h2 className="text-3xl font-black tracking-tight leading-none uppercase">
            About This Vehicle
          </h2>
          <div className="text-lg text-muted-foreground leading-relaxed whitespace-pre-line max-w-prose">
            {vehicle.description}
          </div>
        </section>
      )}

      {/* Highlights */}
      {vehicle.highlights.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-primary flex items-center gap-2">
            <Zap className="h-5 w-5 fill-primary" />
            Key Highlights
          </h2>
          <div className="flex flex-wrap gap-3">
            {vehicle.highlights.map((highlight: string) => (
              <Badge 
                key={highlight} 
                variant="outline" 
                className="bg-primary/5 border-primary/20 text-sm font-bold tracking-tight py-2 px-4 rounded-full"
              >
                {highlight}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      {vehicle.features.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-3xl font-black tracking-tight leading-none uppercase">
            Included Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicle.features.map((feature: string) => (
              <div key={feature} className="flex items-center gap-3 p-4 bg-muted/10 rounded-2xl border-2 border-transparent hover:border-primary/20 transition-all">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-base font-bold tracking-tight">{feature}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
