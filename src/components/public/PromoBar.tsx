"use client";

import { useTenant } from "@/components/providers/TenantProvider";
import { getSafeHomepage } from "@/lib/homepage";
import { Megaphone } from "lucide-react";

export function PromoBar() {
  const tenant = useTenant();
  if (!tenant) return null;

  const homepage = getSafeHomepage(tenant.homepage, tenant.branding, tenant.name);

  if (!homepage.showPromo || !homepage.promoText) {
    return null;
  }

  return (
    <div className="bg-primary text-primary-foreground py-2 px-6 text-center">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <Megaphone className="h-4 w-4 animate-pulse shrink-0" />
        <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
          {homepage.promoText}
        </p>
      </div>
    </div>
  );
}
