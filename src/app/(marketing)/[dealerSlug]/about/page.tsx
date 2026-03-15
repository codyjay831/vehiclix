import * as React from "react";
import { Metadata } from "next";
import { Zap, ShieldCheck, Battery, Heart } from "lucide-react";
import { getOrganizationBySlug, getCanonicalUrl } from "@/lib/organization";
import { notFound } from "next/navigation";

interface AboutPageProps {
  params: Promise<{ dealerSlug: string }>;
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org) return { title: "About Us" };

  const dealerName = org.name;
  const canonical = getCanonicalUrl(org, "/about");

  return {
    title: "About",
    description: `Learn about the ${dealerName} mission to redefine the boutique electric vehicle experience.`,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      url: canonical,
    },
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { dealerSlug } = await params;
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org) {
    return notFound();
  }

  const nameParts = org.name.split(' ');
  const firstPart = nameParts[0];
  const restPart = nameParts.slice(1).join(' ');

  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Hero Section */}
        <div className="max-w-3xl space-y-8 mb-24">
          <div className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">
              Our Mission
            </h2>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9] italic">
              Redefining <br />
              <span className="text-primary">Electric</span> <br />
              Excellence.
            </h1>
          </div>
            <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed">
              {org.branding?.aboutBlurb || `${org.name} was born from a simple observation: the transition to electric mobility deserves a purchasing experience as sophisticated as the vehicles themselves.`}
            </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 mb-24">
          <div className="space-y-6">
            <h3 className="text-3xl font-black uppercase tracking-tight italic">
              A Boutique <span className="text-primary">Approach</span>
            </h3>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We move away from traditional high-pressure sales environments toward a clean, 
              transparent, and guided online showroom. Our focus isn't on volume; it's on the 
              careful curation of high-performance electric vehicles that meet our rigorous standards.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Every car in our inventory undergoes a verified battery health assessment and a 
              professional multi-point inspection, ensuring that your transition to an EV 
              is seamless and worry-free at {org.name}.
            </p>
          </div>
          <div className="bg-muted/30 rounded-3xl p-10 border flex flex-col justify-center space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {[
                { title: "Curated Selection", icon: ShieldCheck, desc: "Only the finest EVs make our cut." },
                { title: "Verified Battery", icon: Zap, desc: "Transparent health metrics for every car." },
                { title: "Premium Media", icon: Battery, desc: "High-resolution photo and video specs." },
                { title: "Boutique Service", icon: Heart, desc: "Personalized support for every client." },
              ].map((item) => (
                <div key={item.title} className="space-y-2">
                  <item.icon className="h-5 w-5 text-primary" />
                  <h4 className="font-black uppercase tracking-tight text-sm">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Home Energy Focus */}
        <div className="bg-primary/5 rounded-3xl p-10 md:p-20 text-center space-y-8 border border-primary/10">
          <div className="max-w-2xl mx-auto space-y-6">
            <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tight italic">
              More Than <span className="text-primary">Just a Car.</span>
            </h3>
            <p className="text-lg text-muted-foreground font-medium">
              We believe the EV journey starts at home. Through our partnership with 
              our home energy experts, we integrate your vehicle purchase with home energy 
              solutions—from professional charger installations to solar readiness.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
