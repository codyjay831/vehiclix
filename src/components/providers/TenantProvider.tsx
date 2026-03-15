"use client";

import * as React from "react";

import { OrganizationBranding, OrganizationHomepage } from "@prisma/client";

interface TenantContextType {
  id: string;
  name: string;
  slug: string;
  branding?: OrganizationBranding | null;
  homepage?: OrganizationHomepage | null;
}

const TenantContext = React.createContext<TenantContextType | null>(null);

export function TenantProvider({ 
  children, 
  tenant 
}: { 
  children: React.ReactNode; 
  tenant: TenantContextType;
}) {
  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = React.useContext(TenantContext);
  return context;
}
