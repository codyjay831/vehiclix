import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CarFront, ShieldCheck, Zap, Globe } from "lucide-react";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { getAuthenticatedUser } from "@/lib/auth";
import { Metadata } from "next";
import { BRANDING } from "@/config/branding";
import { storefrontAuthBridgeHref } from "@/lib/storefront-auth-bridge";

export const metadata: Metadata = {
  title: "Modern Dealership Operating System",
  description: "The premium multi-tenant platform for boutique electric vehicle dealerships. Manage inventory, track deals, and provide a world-class showroom experience.",
  alternates: {
    canonical: `https://${BRANDING.platformDomain}`,
  },
};

export default async function RootLandingPage() {
  const user = await getAuthenticatedUser();
  const userRole = user?.role || null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar userRole={userRole} />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-black uppercase tracking-[0.2em]">
            <Globe className="h-3 w-3" />
            Modern Dealership Operating System
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-[0.85] italic">
            Drive Your <br />
            <span className="text-primary">Business Forward.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground font-medium max-w-3xl mx-auto leading-relaxed">
            Vehiclix is the premium multi-tenant platform for boutique electric vehicle dealerships. 
            Manage inventory, track deals, and provide a world-class showroom experience.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href={storefrontAuthBridgeHref("/")}>
              <Button size="lg" className="h-16 px-12 rounded-full font-black uppercase tracking-widest shadow-xl group">
                Get Started
                <ShieldCheck className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="h-16 px-12 rounded-full font-bold uppercase tracking-widest border-2">
              View Demo
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="bg-primary/10 p-3 rounded-2xl w-fit">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Enterprise Isolation</h3>
              <p className="text-muted-foreground leading-relaxed">
                Secure, database-level isolation for every dealership. Your data remains yours, 
                protected by our SaaS runtime foundation.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-primary/10 p-3 rounded-2xl w-fit">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Instant Showrooms</h3>
              <p className="text-muted-foreground leading-relaxed">
                Deploy high-performance, SEO-optimized digital showrooms in seconds. 
                Optimized for electric vehicle inventory.
              </p>
            </div>
            <div className="space-y-4">
              <div className="bg-primary/10 p-3 rounded-2xl w-fit">
                <CarFront className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight">Deal Lifecycle</h3>
              <p className="text-muted-foreground leading-relaxed">
                From inquiry to digital signature. Track every step of the vehicle purchase 
                process with integrated DocuSign and Stripe.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
