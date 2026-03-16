import * as React from "react";
import { getAuditLogAction } from "@/actions/super-admin";
import { SystemLogView } from "@/components/super-admin/SystemLogView";

export default async function SuperAdminSystemPage() {
  const events = await getAuditLogAction();

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight italic">
          System / Audit log
        </h1>
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">
          Platform-wide activity and audit events
        </p>
      </div>

      <SystemLogView events={events} />
    </div>
  );
}
