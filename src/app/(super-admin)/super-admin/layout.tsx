import Link from "next/link";
import { LayoutDashboard, Users, Shield, LogOut, Menu, UserCircle } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  const navItems = [
    { label: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { label: "Dealerships", href: "/super-admin/dealerships", icon: Shield },
    { label: "Users", href: "/super-admin/users", icon: UserCircle },
    { label: "Requests", href: "/super-admin/requests", icon: Users },
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
          Platform Admin
          <p className="text-xs font-bold text-foreground lowercase tracking-normal mt-1 truncate">
            {user.email}
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive h-8 px-2">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden lg:flex w-64 flex-col border-r bg-background sticky top-0 h-screen">
        <div className="p-6 border-b flex items-center gap-2 font-bold text-xl tracking-tight">
          <Shield className="h-6 w-6 text-primary" />
          <span>Vehiclix <span className="text-primary font-black uppercase tracking-widest text-[10px] bg-primary/10 px-1 rounded ml-1">Admin</span></span>
        </div>
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="lg:hidden border-b bg-background p-4 flex justify-between items-center sticky top-0 z-10">
          <Link href="/super-admin" className="font-bold">Vehiclix Admin</Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 flex flex-col w-72">
              <SheetHeader className="p-6 border-b">
                <SheetTitle className="flex items-center gap-2 font-bold text-xl tracking-tight text-left">
                  <Shield className="h-6 w-6 text-primary" />
                  <span>Vehiclix Admin</span>
                </SheetTitle>
              </SheetHeader>
              {sidebarContent}
            </SheetContent>
          </Sheet>
        </header>
        
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
