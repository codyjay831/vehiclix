"use client";

import { useTenant } from "@/components/providers/TenantProvider";
import { getSafeHomepage } from "@/lib/homepage";
import { Quote } from "lucide-react";

export function Testimonial() {
  const tenant = useTenant();
  if (!tenant) return null;

  const homepage = getSafeHomepage(tenant.homepage, tenant.branding, tenant.name);

  if (!homepage.showTestimonial || !homepage.testimonialQuote) {
    return null;
  }

  return (
    <section className="py-24 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-12">
          <div className="bg-primary/5 p-6 rounded-3xl">
            <Quote className="h-10 w-10 text-primary fill-primary/10" />
          </div>
          
          <blockquote className="text-3xl md:text-5xl font-black tracking-tighter uppercase leading-[1.1] italic">
            "{homepage.testimonialQuote}"
          </blockquote>

          <div className="space-y-2 pt-4">
            <div className="w-12 h-1 bg-primary mx-auto" />
            <cite className="not-italic font-black uppercase tracking-[0.3em] text-sm text-primary">
              {homepage.testimonialAuthor || "Verified Customer"}
            </cite>
          </div>
        </div>
      </div>
      
      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,var(--color-primary)_0%,transparent_50%)] opacity-[0.02] pointer-events-none" />
    </section>
  );
}
