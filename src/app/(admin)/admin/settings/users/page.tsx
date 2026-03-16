import { db } from "@/lib/db";
import { requireUserWithOrg } from "@/lib/auth";
import { Role } from "@prisma/client";
import { UserTable } from "@/components/admin/UserTable";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ShieldAlert, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Team Management | Admin",
};

export default async function TeamManagementPage() {
  const user = await requireUserWithOrg();

  // ONLY OWNER or Support Mode can access
  const isOwner = user.role === Role.OWNER;
  const isSupportMode = !!user.isSupportMode;

  if (!isOwner && !isSupportMode) {
    return (
      <div className="p-4 md:p-8 space-y-8 bg-muted/30 min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full rounded-2xl border-2 border-destructive/20 bg-card p-8 text-center shadow-xl">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl font-black uppercase tracking-tight text-destructive">
            Access Restricted
          </h1>
          <p className="mt-4 text-muted-foreground font-medium">
            Only dealership owners have permission to manage the organization's team members.
          </p>
          <p className="mt-2 text-sm text-muted-foreground italic">
            Please contact your account administrator if you believe this is an error.
          </p>
        </Card>
      </div>
    );
  }

  // Fetch all users in the organization
  const users = await db.user.findMany({
    where: {
      organizationId: user.organizationId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="p-4 md:p-8 space-y-8 bg-muted/30 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.8] italic">
            Team <span className="text-primary">Management</span>
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground font-medium mt-4">
            <Badge variant="outline" className="font-black uppercase tracking-widest text-[9px]">
              {users.length} Total Users
            </Badge>
            <span>Managing organization users and permissions.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 max-w-7xl">
        <UserTable 
          initialUsers={users} 
          currentUserRole={user.role} 
          currentUserId={user.id} 
        />
        
        {/* Support Info Card */}
        <Card className="rounded-2xl border-2 bg-muted/20 border-dashed">
          <CardHeader className="pb-4">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-primary" />
              Role Permissions Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="font-black uppercase tracking-widest text-[8px]">Owner</Badge>
                  <p className="text-xs font-black uppercase tracking-tight italic">Full Administrative Access</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-12 border-l-2 border-primary/20">
                  Owners can manage inventory, view all deals, access billing settings, and add/remove team members.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-black uppercase tracking-widest text-[8px]">Staff</Badge>
                  <p className="text-xs font-black uppercase tracking-tight italic">Operations Access</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pl-12 border-l-2 border-muted">
                  Staff members can manage inventory, inquiries, and leads, but cannot access billing or team settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
