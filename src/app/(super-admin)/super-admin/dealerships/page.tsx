import * as React from "react";
import { getOrganizationsAction } from "@/actions/super-admin";
import { DealershipDirectory } from "@/components/super-admin/DealershipDirectory";

export default async function DealershipsPage() {
  const organizations = await getOrganizationsAction();

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight italic">Dealership Directory</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">
            Browse and preview all managed dealership environments
          </p>
        </div>
      </div>

      <DealershipDirectory organizations={organizations} />
    </div>
  );
}
