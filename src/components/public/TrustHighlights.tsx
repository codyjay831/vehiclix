"use client";

import { useTenant } from "@/components/providers/TenantProvider";
import { getSafeHomepage } from "@/lib/homepage";
import { ShieldCheck, Zap, Star, Phone } from "lucide-react";

const ICON_MAP = {
  ShieldCheck,
  Zap,
  Star,
  Phone,
};

export function TrustHighlights() {
  const tenant = useTenant();
  if (!tenant) return null;

  const homepage = getSafeHomepage(tenant.homepage, tenant.branding, tenant.name);

  if (!homepage.showTrustHighlights) {
    return null;
  }

  return (
    <section className="py-12 border-y bg-muted/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {homepage.trustHighlights.map((item, i) => {
            const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP] || ShieldCheck;
            return (
              <div key={i} className="flex flex-col items-center text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-2xl">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-black uppercase tracking-tight italic text-lg">{item.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed max-w-[200px]">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
