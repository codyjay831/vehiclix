"use client";

import Link from "next/link";
import { CarFront, Mail, Phone, MapPin, Instagram, Twitter, Linkedin } from "lucide-react";
import { useTenant } from "@/components/providers/TenantProvider";

import { BRANDING } from "@/config/branding";
import { storefrontAuthBridgeHref } from "@/lib/storefront-auth-bridge";

export function Footer() {
  const tenant = useTenant();
  const branding = tenant?.branding;
  const companyName = tenant?.name || BRANDING.companyName;
  const logoHref = tenant ? `/${tenant.slug}` : "/";

  return (
    <footer className="bg-muted/30 border-t pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-6">
            <Link href={logoHref} className="flex items-center gap-2">
              {branding?.logoUrl ? (
                <img 
                  src={branding.logoUrl} 
                  alt={companyName} 
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <>
                  <div className="bg-primary text-primary-foreground p-1 rounded-lg">
                    <CarFront className="h-5 w-5" />
                  </div>
                  <span className="text-xl font-black uppercase tracking-tighter">
                    {companyName.split(' ')[0]} {companyName.split(' ')[1] && <span className="text-primary">{companyName.split(' ')[1]}</span>}
                  </span>
                </>
              )}
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              {tenant ? `${companyName} - ${BRANDING.slogan}` : BRANDING.description}
            </p>
            <div className="flex gap-4">
              {/* Social links hidden until real profiles exist */}
            </div>
          </div>

          {/* Quick Links */}
          {tenant ? (
            <>
              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest">Showroom</h4>
                <ul className="space-y-4 text-sm font-bold uppercase tracking-tight">
                  <li><Link href={`/${tenant.slug}/inventory`} className="text-muted-foreground hover:text-primary transition-colors">All Inventory</Link></li>
                  <li><Link href={`/${tenant.slug}/inventory?sort=newest`} className="text-muted-foreground hover:text-primary transition-colors">New Arrivals</Link></li>
                  {branding?.publicSiteMode !== "INVENTORY_ONLY" && (
                    <li><Link href={`/${tenant.slug}/request-vehicle`} className="text-muted-foreground hover:text-primary transition-colors">Find My EV</Link></li>
                  )}
                </ul>
              </div>

              {/* Company */}
              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest">Company</h4>
                <ul className="space-y-4 text-sm font-bold uppercase tracking-tight">
                  {branding?.publicSiteMode !== "INVENTORY_ONLY" && (
                    <>
                      <li><Link href={`/${tenant.slug}/about`} className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
                      <li><Link href={`/${tenant.slug}/contact`} className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
                    </>
                  )}
                  <li><Link href={storefrontAuthBridgeHref()} className="text-muted-foreground hover:text-primary transition-colors">Customer Portal</Link></li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest">Platform</h4>
                <ul className="space-y-4 text-sm font-bold uppercase tracking-tight">
                  <li><Link href="/#features" className="text-muted-foreground hover:text-primary transition-colors">Features</Link></li>
                  <li><Link href="/request-access" className="text-muted-foreground hover:text-primary transition-colors font-black text-primary italic">Request Access</Link></li>
                  <li><Link href={storefrontAuthBridgeHref()} className="text-muted-foreground hover:text-primary transition-colors">Partner Login</Link></li>
                </ul>
              </div>
              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest">Legal</h4>
                <ul className="space-y-4 text-sm font-bold uppercase tracking-tight">
                  <li><Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link></li>
                </ul>
              </div>
            </>
          )}

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest">Get in Touch</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{branding?.contactEmail || (!tenant ? BRANDING.contact.email : null) || "Contact us for inquiries"}</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{branding?.contactPhone || tenant?.phone || BRANDING.contact.phone}</span>
              </li>
              {(branding?.address || (!tenant && BRANDING.contact.address)) && (
                <li className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{branding?.address || BRANDING.contact.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            © 2026 {companyName}. All Rights Reserved.
          </p>
          {tenant && (
            <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
