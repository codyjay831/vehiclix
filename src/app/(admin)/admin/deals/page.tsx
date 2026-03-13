import * as React from "react";
import Link from "next/link";
import { getAdminDeals } from "@/lib/deal";
import { DEAL_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/types";
import { DealStatus, PaymentStatus } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
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
import { ChevronRight, FileText, Filter } from "lucide-react";

export default async function AdminDealsPage() {
  const user = await getAuthenticatedUser();
  if (!user || !user.organizationId) {
    redirect("/login");
  }

  const deals = await getAdminDeals(user.organizationId);

  const getStatusBadge = (status: DealStatus) => {
    switch (status) {
      case DealStatus.COMPLETED:
        return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full">{DEAL_STATUS_LABELS[status]}</Badge>;
      case DealStatus.CANCELLED:
        return <Badge variant="secondary" className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full">{DEAL_STATUS_LABELS[status]}</Badge>;
      default:
        return <Badge variant="outline" className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border-2">{DEAL_STATUS_LABELS[status]}</Badge>;
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Deals</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage active vehicle purchase transactions.
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
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Vehicle</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Price</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Deposit</TableHead>
              <TableHead className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Stage</TableHead>
              <TableHead className="text-right pr-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="bg-muted p-3 rounded-full">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">No deals yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              deals.map((deal) => {
                const latestDeposit = deal.deposits[0];
                return (
                  <TableRow key={deal.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6 py-4">
                      <span className="font-bold text-sm">
                        {new Date(deal.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{deal.user.firstName} {deal.user.lastName}</span>
                        <span className="text-xs text-muted-foreground">{deal.user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{deal.vehicle.year} {deal.vehicle.make}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">{deal.vehicle.model}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 font-mono text-sm font-bold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(Number(deal.purchasePrice))}
                    </TableCell>
                    <TableCell className="py-4">
                      {latestDeposit ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(latestDeposit.depositAmount))}</span>
                          <span className={`text-[10px] uppercase font-bold ${latestDeposit.paymentStatus === PaymentStatus.SUCCEEDED ? "text-green-600" : "text-amber-600"}`}>
                            {latestDeposit.paymentStatus}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4">
                      {getStatusBadge(deal.dealStatus)}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <Link href={`/admin/deals/${deal.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
