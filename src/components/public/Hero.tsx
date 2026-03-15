"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Zap, Star, Phone } from "lucide-react";
import { useTenant } from "@/components/providers/TenantProvider";
import { getSafeHomepage } from "@/lib/homepage";
import { cn } from "@/lib/utils";

const ICON_MAP = {
  ShieldCheck,
  Zap,
  Star,
  Phone,
};

export function Hero() {
  const tenant = useTenant();
  
  if (!tenant) return null;

  const homepage = getSafeHomepage(tenant.homepage, tenant.branding, tenant.name);

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
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] uppercase italic whitespace-pre-line">
            {homepage.heroHeadline}
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {homepage.heroSubheadline}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
            <Link href={`/${tenant.slug}/${homepage.heroPrimaryCtaRoute}`} className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-16 px-10 rounded-full text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20 group">
                {homepage.heroPrimaryCtaLabel}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href={`/${tenant.slug}/request-vehicle`} className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-10 rounded-full text-lg font-bold uppercase tracking-widest border-2">
                Find My EV
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          {homepage.showTrustHighlights && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-12">
              {homepage.trustHighlights.slice(0, 3).map((item, i) => {
                const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP] || ShieldCheck;
                return (
                  <div key={i} className={cn(
                    "flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground",
                    i === 2 && "col-span-2 md:col-span-1 justify-center md:justify-start"
                  )}>
                    <Icon className="h-4 w-4 text-primary" />
                    {item.title}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_70%)] opacity-[0.03] pointer-events-none" />
    </section>
  );
}
