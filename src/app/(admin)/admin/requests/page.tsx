import * as React from "react";
import Link from "next/link";
import { getAdminRequests } from "@/lib/request";
import { REQUEST_STATUS_LABELS } from "@/types";
import { VehicleRequestStatus, Priority } from "@prisma/client";
import { requireUserWithOrg } from "@/lib/auth";
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
import { ChevronRight, ClipboardList, Filter } from "lucide-react";

export default async function AdminRequestsPage() {
  const user = await requireUserWithOrg();

  const requests = await getAdminRequests(user.organizationId);

  const getPriorityBadge = (priority: Priority | null) => {
    switch (priority) {
      case Priority.HIGH:
        return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">High</Badge>;
      case Priority.MEDIUM:
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Medium</Badge>;
      case Priority.LOW:
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">Low</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">None</Badge>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sourcing Requests</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage custom vehicle sourcing requests from customers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <div className="border rounded-xl bg-background overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              <TableHead className="w-[150px] font-bold uppercase text-[10px] tracking-widest text-muted-foreground pl-6">Date</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Customer</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Vehicle Desired</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Budget</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Priority</TableHead>
              <TableHead className="text-right pr-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="bg-muted p-3 rounded-full">
                      <ClipboardList className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No requests yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <span className="font-bold text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{request.user.firstName} {request.user.lastName}</span>
                      <span className="text-xs text-muted-foreground">{request.user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{request.make} {request.model}</span>
                      {(request.yearMin || request.yearMax) && (
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">
                          {request.yearMin || "?"} - {request.yearMax || "?"}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 font-mono text-sm font-bold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(Number(request.budgetMax))}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge 
                      variant={
                        request.requestStatus === VehicleRequestStatus.SUBMITTED ? "default" :
                        request.requestStatus === VehicleRequestStatus.CLOSED ? "secondary" :
                        "outline"
                      }
                      className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full"
                    >
                      {REQUEST_STATUS_LABELS[request.requestStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    {getPriorityBadge(request.priority)}
                  </TableCell>
                  <TableCell className="text-right pr-6 py-4">
                    <Link href={`/admin/requests/${request.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
