import Link from "next/link";
import { LayoutDashboard, CarFront, MessageSquare, FileText, LogOut, Menu } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { getOrganizationById } from "@/lib/organization";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { BRANDING } from "@/config/branding";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== "OWNER") {
    redirect("/login");
  }

  const organization = user.organizationId 
    ? await getOrganizationById(user.organizationId) 
    : null;
  
  const orgName = organization?.name || BRANDING.companyName;
  const orgPrefix = orgName.split(' ')[0].toUpperCase();

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Inventory", href: "/admin/inventory", icon: CarFront },
    { label: "Inquiries", href: "/admin/inquiries", icon: MessageSquare },
    { label: "Deals", href: "/admin/deals", icon: FileText },
  ];

  const sidebarContent = (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors group"
          >
            <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t space-y-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Owner Account
          <p className="text-xs font-bold text-foreground lowercase tracking-normal mt-1 truncate">
            {user.email}
          </p>
        </div>
        <form action={logoutAction}>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive h-8 px-2">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r bg-background sticky top-0 h-screen">
        <div className="p-6 border-b">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <span className="bg-primary text-primary-foreground rounded p-1 px-2">{orgPrefix}</span>
            <span>Admin</span>
          </Link>
        </div>
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Admin Header - Mobile */}
        <header className="lg:hidden border-b bg-background p-4 flex justify-between items-center sticky top-0 z-10">
          <Link href="/admin" className="font-bold">{orgPrefix} Admin</Link>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 flex flex-col w-72">
              <SheetHeader className="p-6 border-b">
                <SheetTitle className="flex items-center gap-2 font-bold text-xl tracking-tight text-left">
                  <span className="bg-primary text-primary-foreground rounded p-1 px-2">{orgPrefix}</span>
                  <span>Admin</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 flex flex-col">
                {sidebarContent}
              </div>
            </SheetContent>
          </Sheet>
        </header>
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
