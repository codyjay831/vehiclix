import Link from "next/link";
import { CarFront, Mail, Phone, MapPin, Instagram, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1 rounded-lg">
                <CarFront className="h-5 w-5" />
              </div>
              <span className="text-xl font-black uppercase tracking-tighter">
                Evo <span className="text-primary">Motors</span>
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Redefining the used EV experience through curated inventory, 
              transparent specs, and home energy integration.
            </p>
            <div className="flex gap-4">
              {/* Social links hidden until real profiles exist */}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest">Showroom</h4>
            <ul className="space-y-4 text-sm font-bold uppercase tracking-tight">
              <li><Link href="/inventory" className="text-muted-foreground hover:text-primary transition-colors">All Inventory</Link></li>
              <li><Link href="/inventory?sort=newest" className="text-muted-foreground hover:text-primary transition-colors">New Arrivals</Link></li>
              <li><Link href="/request-vehicle" className="text-muted-foreground hover:text-primary transition-colors">Find My EV</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest">Company</h4>
            <ul className="space-y-4 text-sm font-bold uppercase tracking-tight">
              <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">Customer Portal</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-widest">Get in Touch</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>hello@evomotors.com</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>(555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>123 EV Way, Silicon Valley, CA</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
            © 2026 Evo Motors. All Rights Reserved.
          </p>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
