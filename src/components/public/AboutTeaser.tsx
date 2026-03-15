"use client";

import { useTenant } from "@/components/providers/TenantProvider";
import { getSafeHomepage } from "@/lib/homepage";
import { ArrowRight, Search, Zap, Battery, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  {
    title: "Curated Inventory",
    description: "Every vehicle is selected for performance and battery health.",
    icon: Search,
  },
  {
    title: "Transparent Specs",
    description: "Full transparency on specs, features, and verified range.",
    icon: Zap,
  },
];

export function AboutTeaser() {
  const tenant = useTenant();
  if (!tenant) return null;

  const homepage = getSafeHomepage(tenant.homepage, tenant.branding, tenant.name);

  if (!homepage.showAboutTeaser) {
    return null;
  }

  return (
    <section className="py-24 overflow-hidden bg-muted/20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Text Content */}
          <div className="space-y-12">
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">
                The {tenant.name.split(' ')[0]} Mission
              </h2>
              <h3 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none italic">
                Rethinking <br />Electric.
              </h3>
            </div>

            <p className="text-xl text-muted-foreground font-medium max-w-xl leading-relaxed">
              {homepage.aboutTeaser}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
              {SECTIONS.map((item) => (
                <div key={item.title} className="space-y-4">
                  <div className="bg-primary/5 p-3 rounded-xl w-fit">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-tight">{item.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
            
            <Link href={`/${tenant.slug}/about`} className="block pt-4">
              <Button size="lg" variant="outline" className="rounded-full px-8 h-14 font-black uppercase tracking-widest group">
                Full About Our Mission
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {/* Decorative sourcing teaser box */}
          <div className="bg-background rounded-3xl p-10 md:p-16 space-y-10 border shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <div className="space-y-2">
                <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic">
                  Find Your <br /><span className="text-primary">Perfect EV</span>
                </h3>
                <p className="text-muted-foreground font-medium">
                  Looking for something specific? Our sourcing specialists can help you find 
                  exactly what you're after through our extensive network.
                </p>
              </div>
              <ul className="space-y-3 text-sm font-bold uppercase tracking-tight">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Custom Inventory Sourcing
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Verified Battery Inspections
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Direct Private Collection Access
                </li>
              </ul>
              <Link href={`/${tenant.slug}/request-vehicle`} className="block pt-4">
                <Button size="lg" className="rounded-full px-8 h-14 font-black uppercase tracking-widest shadow-lg group">
                  Start Sourcing Request
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
