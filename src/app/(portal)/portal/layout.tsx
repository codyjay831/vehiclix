import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { CarFront, UserCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";
import { getOrganizationById } from "@/lib/organization";
import { BRANDING } from "@/config/branding";
import { TenantProvider } from "@/components/providers/TenantProvider";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  // Middleware also protects /portal/* but we double-check here for safety
  if (!user) {
    redirect("/login");
  }

  // Safety: Ensure organization context is present to avoid downstream crashes
  if (!user.organizationId) {
    console.error(`Portal user ${user.id} (${user.email}) missing organization context.`);
    redirect("/login");
  }

  const organization = await getOrganizationById(user.organizationId);
  const orgSlug = organization?.slug || "";
  
  const orgName = organization?.name || BRANDING.companyName;
  const orgParts = orgName.split(' ');
  const orgFirst = orgParts[0];
  const orgRest = orgParts.slice(1).join(' ');

  const tenant = organization ? {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    branding: organization.branding,
  } : null;

  if (!tenant) {
    redirect("/login");
  }

  return (
    <TenantProvider tenant={tenant}>
      <div className="min-h-screen bg-[#FDFDFD] text-[#1A1A1A] font-sans">
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-10">
              <Link href="/" className="group flex items-center gap-2">
                <div className="bg-primary/5 p-1.5 rounded-lg group-hover:bg-primary/10 transition-colors">
                  <CarFront className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xl font-black uppercase tracking-tighter italic">
                  {orgFirst}<span className="text-primary">{orgRest ? ` ${orgRest}` : ""}</span>
                </span>
              </Link>
              <nav className="hidden md:flex items-center gap-8">
                <Link
                  href="/portal"
                  className="text-xs font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/portal/documents"
                  className="text-xs font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
                >
                  Documents
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end mr-2 text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Account Identity
                </span>
                <span className="text-xs font-bold truncate max-w-[180px]">{user.email}</span>
              </div>
              <div className="h-10 w-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                <UserCircle className="h-6 w-6" />
              </div>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-destructive/5 hover:text-destructive transition-colors">
                  <LogOut className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main>{children}</main>

        {/* Minimal Portal Footer */}
        <footer className="border-t bg-white mt-auto">
          <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              © 2026 {orgName} Platform
            </p>
            <div className="flex items-center gap-6">
              <Link href={`/${tenant.slug}/inventory`} className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">
                Inventory
              </Link>
              <Link href={`/${tenant.slug}/request-vehicle`} className="text-xs font-black uppercase tracking-widest hover:text-primary transition-colors">
                Request Vehicle
              </Link>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 px-3 py-1 border rounded-full">
                {user.isStub ? "Stub Account" : "Registered Account"}
              </span>
            </div>
          </div>
        </footer>
      </div>
    </TenantProvider>
  );
}
