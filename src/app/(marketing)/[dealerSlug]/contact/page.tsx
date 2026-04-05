import * as React from "react";
import { Metadata } from "next";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getOrganizationBySlug, getCanonicalUrl } from "@/lib/organization";
import { notFound } from "next/navigation";
import { BRANDING } from "@/config/branding";

interface ContactPageProps {
  params: Promise<{ dealerSlug: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org) return { title: "Contact Us" };

  const dealerName = org.name;
  const canonical = getCanonicalUrl(org, "/contact");

  return {
    title: "Contact",
    description: `Get in touch with the ${dealerName} team for all your EV showroom and sourcing needs.`,
    alternates: {
      canonical: canonical,
    },
    openGraph: {
      url: canonical,
    },
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { dealerSlug } = await params;
  const org = await getOrganizationBySlug(dealerSlug);

  if (!org || org.branding?.publicSiteMode === "INVENTORY_ONLY") {
    return notFound();
  }

  const contactDetails = [
    {
      title: "Call Us",
      content: org.branding?.contactPhone || org.phone || BRANDING.contact.phone,
      icon: Phone,
      href: `tel:${(org.branding?.contactPhone || org.phone || BRANDING.contact.phone).replace(/\D/g, '')}`,
    },
    ...(org.branding?.contactEmail ? [{
      title: "Email Us",
      content: org.branding.contactEmail,
      icon: Mail,
      href: `mailto:${org.branding.contactEmail}`,
    }] : []),
    {
      title: "Visit Our Showroom",
      content: org.branding?.address || BRANDING.contact.address,
      icon: MapPin,
      href: `https://maps.google.com?q=${encodeURIComponent(org.branding?.address || BRANDING.contact.address)}`,
    },
  ];

  return (
    <div className="min-h-screen pt-32 pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
          {/* Text Content */}
          <div className="lg:col-span-7 space-y-12">
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">
                Connect
              </h2>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-[0.9] italic">
                Get in <br />
                <span className="text-primary">Touch</span>
              </h1>
            </div>
            
            <p className="text-xl text-muted-foreground font-medium max-w-2xl leading-relaxed">
              Have a question about our inventory or a vehicle sourcing request? 
              Our specialists at {org.name} are ready to help you find your dream electric vehicle.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {contactDetails.map((item) => (
                <div key={item.title} className="space-y-4 group">
                  <div className="bg-primary/5 p-3 rounded-xl w-fit group-hover:bg-primary/10 transition-colors">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase tracking-tight">{item.title}</h4>
                    <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors inline-block">
                      {item.content}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Support / Hours Card */}
          <div className="lg:col-span-5 bg-muted/30 rounded-3xl p-10 md:p-16 border space-y-10 relative overflow-hidden group">
            <div className="relative z-10 space-y-8">
              <div className="space-y-2">
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight italic">
                  Showroom <br /><span className="text-primary">Hours.</span>
                </h3>
                <p className="text-muted-foreground text-sm font-medium">
                  We are available for private viewings and test drives by appointment.
                </p>
              </div>
              
              <ul className="space-y-3 text-sm font-bold uppercase tracking-tight">
                <li className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Mon – Fri</span>
                  <span>9:00 AM – 6:00 PM</span>
                </li>
                <li className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Saturday</span>
                  <span>10:00 AM – 4:00 PM</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-muted-foreground">Sunday</span>
                  <span className="text-primary">By Appointment</span>
                </li>
              </ul>

              <div className="pt-4 space-y-4">
                <Link href={`/${org.slug}/request-vehicle`} className="block">
                  <Button size="lg" className="w-full rounded-full h-14 font-black uppercase tracking-widest shadow-lg group">
                    Schedule Viewing
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href={`/${org.slug}/inventory`} className="block">
                  <Button variant="outline" size="lg" className="w-full rounded-full h-14 font-bold uppercase tracking-widest border-2">
                    Browse Showroom
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
