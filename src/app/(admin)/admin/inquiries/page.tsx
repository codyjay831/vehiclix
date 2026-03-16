import * as React from "react";
import Link from "next/link";
import { getAdminInquiries } from "@/lib/inquiry";
import { INQUIRY_STATUS_LABELS } from "@/types";
import { InquiryStatus } from "@prisma/client";
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
import { ChevronRight, MessageSquare, Filter } from "lucide-react";

export default async function AdminInquiriesPage() {
  const user = await requireUserWithOrg();

  const inquiries = await getAdminInquiries(user.organizationId);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicle Inquiries</h1>
          <p className="text-muted-foreground mt-1">
            Manage and respond to customer questions about your inventory.
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
              <TableHead className="w-[180px] font-bold uppercase text-[10px] tracking-widest text-muted-foreground pl-6">Date</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Customer</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Vehicle</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
              <TableHead className="text-right pr-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="bg-muted p-3 rounded-full">
                      <MessageSquare className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No inquiries yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              inquiries.map((inquiry) => (
                <TableRow key={inquiry.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">
                        {new Date(inquiry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{inquiry.firstName} {inquiry.lastName}</span>
                      <span className="text-xs text-muted-foreground">{inquiry.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Link 
                      href={`/admin/inventory/${inquiry.vehicleId}`}
                      className="text-sm font-medium hover:text-primary transition-colors underline-offset-4 hover:underline decoration-2"
                    >
                      {inquiry.vehicle.year} {inquiry.vehicle.make} {inquiry.vehicle.model}
                    </Link>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge 
                      variant={
                        inquiry.inquiryStatus === InquiryStatus.NEW ? "default" :
                        inquiry.inquiryStatus === InquiryStatus.CLOSED ? "secondary" :
                        "outline"
                      }
                      className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full"
                    >
                      {INQUIRY_STATUS_LABELS[inquiry.inquiryStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6 py-4">
                    <Link href={`/admin/inquiries/${inquiry.id}`}>
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
