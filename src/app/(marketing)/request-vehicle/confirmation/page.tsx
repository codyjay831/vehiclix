import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { CheckCircle2, ArrowRight, Mail, LayoutDashboard } from "lucide-react";

import { BRANDING } from "@/config/branding";

export default function RequestConfirmationPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center pt-32 pb-20 px-6 lg:px-8 text-center max-w-3xl mx-auto w-full">
        <div className="bg-green-100 p-6 rounded-full mb-8">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </div>
        
        <div className="space-y-4 mb-12">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            Request <br /><span className="text-primary">Received!</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
            We've received your vehicle sourcing request. Our team will review your preferences and begin searching our network.
          </p>
        </div>

        {/* Next Steps Card */}
        <div className="w-full bg-muted/30 rounded-3xl p-10 md:p-12 border-2 space-y-8 mb-12 text-left">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary">What Happens Next</h3>
          
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 bg-background rounded-full border-2 flex items-center justify-center font-black text-primary">1</div>
              <div className="space-y-1">
                <h4 className="font-black uppercase tracking-tight">Dealer Review</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our sourcing specialist will review your budget and preferences within 2 business days.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 bg-background rounded-full border-2 flex items-center justify-center font-black text-primary">2</div>
              <div className="space-y-1">
                <h4 className="font-black uppercase tracking-tight">Active Sourcing</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We'll search auction networks and private collections to find vehicles matching your criteria.
                </p>
              </div>
            </div>
            
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 bg-background rounded-full border-2 flex items-center justify-center font-black text-primary">3</div>
              <div className="space-y-1">
                <h4 className="font-black uppercase tracking-tight">Vehicle Proposals</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You'll receive email updates when we find options. You can review photos and specs in your portal.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link href="/inventory" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-16 px-10 rounded-full font-black uppercase tracking-widest shadow-xl group">
              Browse Showroom
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-10 rounded-full font-bold uppercase tracking-widest border-2 flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" />
              Customer Portal
            </Button>
          </Link>
        </div>

        <div className="pt-16 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
          <Mail className="h-4 w-4 text-primary" />
          Questions? {BRANDING.contact.email}
        </div>
      </main>

      <Footer />
    </div>
  );
}
