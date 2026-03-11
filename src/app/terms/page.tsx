import * as React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for our electric vehicle showroom and purchasing platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="space-y-16">
          <div className="space-y-4 text-center">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">
              The Agreement
            </h2>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9] italic">
              Terms of <br />
              <span className="text-primary">Service.</span>
            </h1>
          </div>

          <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
            <section className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight italic border-b pb-4">
                1. Acceptance of <span className="text-primary">Terms</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                By accessing Evo Motors, you agree to these terms and conditions. 
                Our platform provides a curated electric vehicle showroom and 
                lifecycle management for vehicle acquisitions.
              </p>
            </section>

            <section className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight italic border-b pb-4">
                2. Vehicle <span className="text-primary">Reservations</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Reservation deposits are intended to hold a vehicle in your name. 
                While deposits are generally refundable before contract signature, 
                they represent a serious commitment to purchase. Vehicle availability 
                is not guaranteed until a deposit is received and confirmed.
              </p>
            </section>

            <section className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight italic border-b pb-4">
                3. Accurate <span className="text-primary">Information</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                You agree to provide accurate identification and documentation throughout 
                 the purchasing flow. Providing fraudulent information may result in the 
                immediate cancellation of a deal and forfeiture of reservation rights.
              </p>
            </section>

            <section className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight italic border-b pb-4">
                4. Home Energy <span className="text-primary">Leads</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Interests in home energy services are recorded as leads for our 
                partner, Baytech Smart Homes. Evo Motors is a facilitator for these 
                service leads and is not responsible for the installation or fulfillment 
                of home energy projects.
              </p>
            </section>
          </div>

          <div className="pt-12 border-t text-center">
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Effective Date: March 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
