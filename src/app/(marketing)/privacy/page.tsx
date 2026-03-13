import * as React from "react";
import { Metadata } from "next";

import { BRANDING } from "@/config/branding";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Our commitment to protecting your data and your privacy.`,
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="space-y-16">
          <div className="space-y-4 text-center">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">
              Data Protection
            </h2>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9] italic">
              Privacy <br />
              <span className="text-primary">Policy.</span>
            </h1>
          </div>

          <div className="prose prose-zinc dark:prose-invert max-w-none space-y-12">
            <section className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight italic border-b pb-4">
                1. Information We <span className="text-primary">Collect</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                At {BRANDING.companyName}, your privacy is a cornerstone of the trust we build. 
                We collect personal information necessary to facilitate your electric 
                vehicle purchase, including contact details, identification documents, 
                and home energy service interests.
              </p>
            </section>

            <section className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight italic border-b pb-4">
                2. How We Use <span className="text-primary">Your Data</span>
              </h3>
              <ul className="list-disc pl-6 space-y-4 text-muted-foreground">
                <li className="font-medium">To process vehicle reservations and purchases.</li>
                <li className="font-medium">To securely verify identification for contract signatures.</li>
                <li className="font-medium">To connect you with home energy partners upon your explicit request.</li>
                <li className="font-medium">To provide critical updates regarding your purchase lifecycle.</li>
              </ul>
            </section>

            <section className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight italic border-b pb-4">
                3. Third-Party <span className="text-primary">Integrations</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                We utilize industry-leading partners to ensure security. Payments are 
                processed via Stripe, and contracts are executed via DocuSign. We do 
                not sell your data to third parties for marketing purposes.
              </p>
            </section>

            <section className="space-y-6">
              <h3 className="text-2xl font-black uppercase tracking-tight italic border-b pb-4">
                4. Data <span className="text-primary">Security</span>
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Your documents and sensitive data are encrypted at rest and in transit. 
                We maintain rigorous security standards to protect your personal information 
                throughout the vehicle acquisition journey.
              </p>
            </section>
          </div>

          <div className="pt-12 border-t text-center">
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Last Updated: March 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
