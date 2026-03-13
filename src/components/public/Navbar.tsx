"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X, CarFront, LogOut } from "lucide-react";
import { Role } from "@prisma/client";
import { LogoutButton } from "@/components/auth/LogoutButton";

import { BRANDING } from "@/config/branding";

interface NavbarProps {
  userRole?: Role | null;
}

export function Navbar({ userRole }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: "Showroom", href: "/inventory" },
    { label: "Find My EV", href: "/request-vehicle" },
    { label: "About", href: "/about" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg group-hover:rotate-3 transition-transform">
              <CarFront className="h-6 w-6" />
            </div>
            <span className="text-xl font-black uppercase tracking-tighter">
              {BRANDING.companyName.split(' ')[0]} <span className="text-primary">{BRANDING.companyName.split(' ')[1]}</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors",
                  pathname === link.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-6 w-px bg-border mx-2" />
            
            {/* Desktop Auth Section */}
            {(!userRole || (userRole !== Role.OWNER && userRole !== Role.CUSTOMER)) ? (
              <Link href="/login">
                <Button variant="ghost" className="font-bold uppercase tracking-widest text-xs">
                  Login
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <Link href={userRole === Role.OWNER ? "/admin" : "/portal"}>
                  <Button variant="ghost" className="font-bold uppercase tracking-widest text-xs">
                    {userRole === Role.OWNER ? "Admin" : "Portal"}
                  </Button>
                </Link>
                <LogoutButton variant="icon" />
              </div>
            )}

            <Link href="/inventory">
              <Button className="rounded-full px-6 font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
                Showroom
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-background border-b animate-in slide-in-from-top duration-200">
          <div className="px-6 py-8 space-y-6 flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xl font-black uppercase tracking-tight"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-4">
              {/* Mobile Auth Section */}
              {(!userRole || (userRole !== Role.OWNER && userRole !== Role.CUSTOMER)) ? (
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full rounded-full h-12 font-bold uppercase tracking-widest">
                    Login
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href={userRole === Role.OWNER ? "/admin" : "/portal"} onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full rounded-full h-12 font-bold uppercase tracking-widest">
                      {userRole === Role.OWNER ? "Admin" : "Portal"}
                    </Button>
                  </Link>
                  <LogoutButton variant="full" onLogout={() => setIsOpen(false)} />
                </>
              )}
              <Link href="/inventory" onClick={() => setIsOpen(false)}>
                <Button className="w-full rounded-full h-12 font-black uppercase tracking-widest">
                  Browse Showroom
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
