import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-black uppercase tracking-[0.2em]">
            <Zap className="h-3 w-3 fill-primary" />
            Boutique Electric Showroom
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] uppercase italic">
            Experience <br />
            <span className="text-primary">Electric</span> <br />
            Excellence.
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed">
            A highly-curated showroom of high-performance electric vehicles. 
            Transparent specs, premium media, and home energy integration — 
            redefining the used EV journey.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
            <Link href="/inventory" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-16 px-10 rounded-full text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 group">
                Browse Showroom
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/request-vehicle" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-10 rounded-full text-lg font-bold uppercase tracking-widest border-2">
                Find My EV
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-12">
            {[
              { label: "Curated Selection", icon: ShieldCheck },
              { label: "Verified Battery Health", icon: Zap },
              { label: "Transparent Pricing", icon: ShieldCheck },
            ].map((item, i) => (
              <div key={i} className={cn(
                "flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground",
                i === 2 && "col-span-2 md:col-span-1 justify-center md:justify-start"
              )}>
                <item.icon className="h-4 w-4 text-primary" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] opacity-[0.03] pointer-events-none" />
    </section>
  );
}

// Small utility needed for cn
import { cn } from "@/lib/utils";
