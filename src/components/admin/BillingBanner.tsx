"use client";

import { OrganizationSubscription } from "@prisma/client";
import { getBillingStatusInfo } from "@/lib/billing";
import { AlertCircle, Info, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BillingBannerProps {
  subscription: OrganizationSubscription | null;
}

export function BillingBanner({ subscription }: BillingBannerProps) {
  const info = getBillingStatusInfo(subscription);

  if (!info.showBanner) return null;

  const styles = {
    info: "bg-blue-500/10 text-blue-600 border-blue-200",
    warning: "bg-orange-500/10 text-orange-600 border-orange-200",
    error: "bg-destructive/10 text-destructive border-destructive/20",
    none: "",
  };

  const icons = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    none: Info,
  };

  const Icon = icons[info.severity as keyof typeof icons];

  return (
    <div className={cn(
      "w-full border-b py-2 px-4 flex items-center justify-between gap-4",
      styles[info.severity as keyof typeof styles]
    )}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest italic">
          {info.message}
        </p>
      </div>
      <Link 
        href="/admin/settings/billing"
        className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest hover:underline whitespace-nowrap"
      >
        Manage Billing
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
