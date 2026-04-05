"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, Globe, CreditCard, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsNav() {
  const pathname = usePathname();

  const tabs = [
    {
      label: "Storefront",
      href: "/admin/settings/storefront",
      icon: Store,
    },
    {
      label: "Users",
      href: "/admin/settings/users",
      icon: Users,
    },
    {
      label: "Custom Domains",
      href: "/admin/settings/domains",
      icon: Globe,
    },
    {
      label: "Billing",
      href: "/admin/settings/billing",
      icon: CreditCard,
    },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wider italic rounded-md transition-all",
              isActive 
                ? "bg-background text-primary shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <tab.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
