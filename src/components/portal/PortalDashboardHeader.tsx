import * as React from "react";
import { User } from "@prisma/client";
import { UserCircle } from "lucide-react";

interface PortalDashboardHeaderProps {
  user: User;
}

export function PortalDashboardHeader({ user }: PortalDashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 p-2 rounded-lg text-primary shadow-sm">
            <UserCircle className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight italic text-primary">
            Customer Portal
          </h1>
        </div>
        <div className="space-y-1">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.9] italic">
            Welcome back, <span className="text-primary">{user.firstName}</span>
          </h2>
          <p className="text-sm font-medium text-muted-foreground italic mt-2 ml-1">
            Track your vehicle transactions and sourcing requests.
          </p>
        </div>
      </div>
    </div>
  );
}
