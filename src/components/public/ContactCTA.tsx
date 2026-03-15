"use client";

import { useTenant } from "@/components/providers/TenantProvider";
import { getSafeHomepage } from "@/lib/homepage";
import { ArrowRight, Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ContactCTA() {
  const tenant = useTenant();
  if (!tenant) return null;

  const homepage = getSafeHomepage(tenant.homepage, tenant.branding, tenant.name);

  if (!homepage.showContactCta) {
    return null;
  }

  return (
    <section className="py-32 relative overflow-hidden bg-primary text-primary-foreground group">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
        <div className="space-y-6 max-w-2xl text-center lg:text-left">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-[0.9] italic">
            {homepage.contactCtaHeadline}
          </h2>
          <p className="text-xl md:text-2xl text-primary-foreground/80 font-medium leading-relaxed italic">
            {homepage.contactCtaBody}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
          <Link href={`/${tenant.slug}/contact`} className="w-full sm:w-auto">
            <Button size="lg" className="bg-background text-foreground hover:bg-background/90 w-full sm:w-auto h-20 px-12 rounded-full text-xl font-black uppercase tracking-widest shadow-2xl group/btn transition-all hover:scale-105">
              Contact Us
              <ArrowRight className="ml-2 h-6 w-6 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <div className="flex flex-col gap-4 text-primary-foreground/70 font-black uppercase tracking-widest text-[10px] items-center lg:items-start italic">
             {tenant.branding?.contactPhone && (
               <div className="flex items-center gap-2">
                 <Phone className="h-3 w-3" />
                 {tenant.branding.contactPhone}
               </div>
             )}
             {tenant.branding?.contactEmail && (
               <div className="flex items-center gap-2">
                 <Mail className="h-3 w-3" />
                 {tenant.branding.contactEmail}
               </div>
             )}
          </div>
        </div>
      </div>
      
      {/* Decorative background circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,white_0%,transparent_70%)] opacity-[0.05] pointer-events-none group-hover:opacity-[0.1] transition-opacity duration-700" />
    </section>
  );
}
