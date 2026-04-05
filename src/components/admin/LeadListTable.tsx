"use client";

import { Lead, LeadStatus, LeadSource } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUTC } from "@/lib/date-utils";
import Link from "next/link";
import { Car, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadWithRelations extends Lead {
  vehicle: { year: number; make: string; model: string } | null;
  assignedTo: { firstName: string; lastName: string } | null;
}

interface LeadListTableProps {
  leads: LeadWithRelations[];
}

const STAGE_COLORS: Record<LeadStatus, string> = {
  NEW: "bg-blue-500/10 text-blue-600 border-blue-200",
  CONTACTED: "bg-purple-500/10 text-purple-600 border-purple-200",
  APPOINTMENT: "bg-orange-500/10 text-orange-600 border-orange-200",
  NEGOTIATING: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  WON: "bg-green-500/10 text-green-600 border-green-200",
  LOST: "bg-slate-500/10 text-slate-600 border-slate-200",
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  INQUIRY: "Inquiry",
  VEHICLE_REQUEST: "Sourcing",
  RESERVATION: "Reservation",
  MANUAL: "Manual",
};

export function LeadListTable({ leads }: LeadListTableProps) {
  if (leads.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground font-medium italic">No leads found matching your criteria.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/30">
          <TableHead className="font-black uppercase tracking-widest text-[10px] py-4">Customer</TableHead>
          <TableHead className="font-black uppercase tracking-widest text-[10px]">Vehicle</TableHead>
          <TableHead className="font-black uppercase tracking-widest text-[10px]">Stage</TableHead>
          <TableHead className="font-black uppercase tracking-widest text-[10px]">Source</TableHead>
          <TableHead className="font-black uppercase tracking-widest text-[10px]">Last Activity</TableHead>
          <TableHead className="font-black uppercase tracking-widest text-[10px] text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id} className="group hover:bg-muted/20 transition-colors">
            <TableCell>
              <div className="flex flex-col py-1">
                <span className="font-bold text-sm">{lead.customerName}</span>
                <span className="text-xs text-muted-foreground">{lead.customerEmail}</span>
              </div>
            </TableCell>
            <TableCell>
              {lead.vehicle ? (
                <div className="flex items-center gap-2">
                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">General Sourcing</span>
              )}
            </TableCell>
            <TableCell>
              <Badge 
                className={cn("font-black uppercase tracking-widest text-[9px] border", STAGE_COLORS[lead.status])}
                variant="outline"
              >
                {lead.status}
              </Badge>
            </TableCell>
            <TableCell>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                {SOURCE_LABELS[lead.source]}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {lead.lastActivityAt ? formatUTC(lead.lastActivityAt, "long") : "N/A"}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Link href={`/admin/leads/${lead.id}`}>
                <Button variant="ghost" size="sm" className="font-black uppercase tracking-widest text-[10px] italic group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
