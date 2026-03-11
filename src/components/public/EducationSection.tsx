import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Zap, Battery, Home } from "lucide-react";

export function EducationSection() {
  const sections = [
    {
      title: "Curated Inventory",
      description: "We don't just sell EVs; we curate them. Every vehicle in our showroom is selected for its performance, condition, and long-term value.",
      icon: Search,
    },
    {
      title: "Transparent Specs",
      description: "No 'call for price' games. We provide full transparency on mileage, features, and verified battery health for every car we list.",
      icon: Zap,
    },
    {
      title: "Battery & Range",
      description: "Battery health is the heartbeat of an EV. Our listings include estimated range and health metrics so you can buy with confidence.",
      icon: Battery,
    },
    {
      title: "Home Energy",
      description: "Your EV needs a home. We provide guidance on charger installations and solar solutions through our Baytech partnership.",
      icon: Home,
    },
  ];

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Text Content */}
          <div className="space-y-12">
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">
                The Evo Standard
              </h2>
              <h3 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none italic">
                Transparent <br />EV Buying.
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
              {sections.map((item) => (
                <div key={item.title} className="space-y-4">
                  <div className="bg-primary/5 p-3 rounded-xl w-fit">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="text-lg font-black uppercase tracking-tight">{item.title}</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Sourcing Teaser */}
          <div className="bg-muted/30 rounded-3xl p-10 md:p-16 space-y-10 border relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <div className="space-y-2">
                <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic">
                  Can't Find Your <br /><span className="text-primary">Dream EV?</span>
                </h3>
                <p className="text-muted-foreground font-medium">
                  Our sourcing specialists search auction networks and private collections 
                  to find the exact electric vehicle you're looking for.
                </p>
              </div>
              <ul className="space-y-3 text-sm font-bold uppercase tracking-tight">
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Custom Make & Model Sourcing
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Verified Auction Inspections
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Transparent Target Pricing
                </li>
              </ul>
              <Link href="/request-vehicle" className="block pt-4">
                <Button size="lg" className="rounded-full px-8 h-14 font-black uppercase tracking-widest shadow-lg group">
                  Find My EV
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            {/* Decorative background circle */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          </div>
        </div>
      </div>
    </section>
  );
}
