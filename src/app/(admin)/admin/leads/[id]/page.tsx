import { db } from "@/lib/db";
import { requireUserWithOrg } from "@/lib/auth";
import { notFound } from "next/navigation";
import { LeadTimeline } from "@/components/admin/LeadTimeline";
import { LeadNoteComposer } from "@/components/admin/LeadNoteComposer";
import { LeadStatusSelector } from "@/components/admin/LeadStatusSelector";
import { LeadAssigneeSelector } from "@/components/admin/LeadAssigneeSelector";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Car, Clock, Calendar, BadgeCheck, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lead Details | Admin",
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserWithOrg();

  const { id } = await params;

  // Org-scoped query for the lead
  const lead = await db.lead.findFirst({
    where: { 
      id, 
      organizationId: user.organizationId 
    },
    include: {
      vehicle: true,
      assignedTo: {
        select: { id: true, firstName: true, lastName: true },
      },
      activities: {
        include: {
          actorUser: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) {
    return notFound();
  }

  // Get assignable users (owners/staff in same org)
  const assignableUsers = await db.user.findMany({
    where: { 
      organizationId: user.organizationId,
      role: { in: [Role.OWNER] } // Expand later to STAFF
    },
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div className="p-4 md:p-8 space-y-8 bg-muted/30 min-h-screen">
      {/* Breadcrumbs / Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-4">
          <Link
            href="/admin/leads"
            className="text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
            Back to Pipeline
          </Link>
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase leading-[0.8] italic">
              Lead <span className="text-primary">Details</span>
            </h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              <Badge variant="outline" className="font-black uppercase tracking-widest text-[9px]">ID: {lead.id.split('-')[0]}</Badge>
              <span>Captured {format(new Date(lead.createdAt), "PPP")}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Management & Info */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status & Assignment */}
          <Card className="rounded-2xl border-2 border-primary/10 shadow-xl shadow-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <BadgeCheck className="h-3 w-3 text-primary" />
                Lead Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <LeadStatusSelector leadId={lead.id} currentStatus={lead.status} />
              <LeadAssigneeSelector 
                leadId={lead.id} 
                currentAssigneeId={lead.assignedToId} 
                assignableUsers={assignableUsers} 
              />
            </CardContent>
          </Card>

          {/* Customer Profile */}
          <Card className="rounded-2xl border-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <BadgeCheck className="h-3 w-3 text-primary" />
                Customer Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xl font-black uppercase tracking-tight italic">{lead.customerName}</p>
                <div className="flex flex-col gap-2 pt-2">
                  <a 
                    href={`mailto:${lead.customerEmail}`} 
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {lead.customerEmail}
                  </a>
                  {lead.customerPhone && (
                    <a 
                      href={`tel:${lead.customerPhone}`} 
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {lead.customerPhone}
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Context */}
          {lead.vehicle && (
            <Card className="rounded-2xl border-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Car className="h-3.5 w-3.5 text-primary" />
                  Vehicle of Interest
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="font-bold text-sm uppercase tracking-tight">
                    {lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium italic uppercase">
                    {lead.vehicle.vin}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="w-full font-black uppercase tracking-widest text-[10px] italic">
                  <Link href={`/admin/inventory/${lead.vehicleId}`}>
                    View Inventory Record
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Metadata / Source */}
          <Card className="rounded-2xl border-2 bg-muted/20">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-muted-foreground">Source</span>
                <span className="text-foreground bg-background px-2 py-1 rounded border">{lead.source}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">{format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                <span className="text-muted-foreground">Last Activity</span>
                <span className="text-foreground">
                  {lead.lastActivityAt ? format(new Date(lead.lastActivityAt), "MMM d, HH:mm") : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline & Notes */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="rounded-3xl border-2 overflow-hidden bg-background">
            <div className="p-8 space-y-8">
              <LeadNoteComposer leadId={lead.id} />
              
              <div className="space-y-6 pt-4">
                <h3 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Activity Timeline
                </h3>
                <LeadTimeline activities={lead.activities} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
