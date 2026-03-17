import * as React from "react";
import { getGlobalUsersAction } from "@/actions/super-admin";
import { GlobalUserDirectory } from "@/components/super-admin/GlobalUserDirectory";
import { DeleteUserTool } from "@/components/super-admin/DeleteUserTool";

export default async function SuperAdminUsersPage() {
  const users = await getGlobalUsersAction();

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight italic">
            Global User Directory
          </h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">
            Search and inspect users across all dealerships
          </p>
        </div>
      </div>

      <DeleteUserTool />

      <GlobalUserDirectory users={users} />
    </div>
  );
}
