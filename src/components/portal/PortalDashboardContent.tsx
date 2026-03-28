"use client";

import * as React from "react";
import Link from "next/link";
import { Deal, VehicleRequest, DealStatus } from "@prisma/client";
import type { PortalActiveDealVehicle } from "@/lib/prisma/vehicle-safe-select";
import type { InquiryWithVehicle } from "@/types";
import { DEAL_STATUS_LABELS, INQUIRY_STATUS_LABELS, REQUEST_STATUS_LABELS } from "@/types";
import { MilestoneTracker } from "./MilestoneTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CarFront, FileText, LayoutDashboard, History, Search, HistoryIcon } from "lucide-react";
import { useTenant } from "@/components/providers/TenantProvider";

type ActiveDealWithContext = Omit<Deal, "vehicle"> & { vehicle: PortalActiveDealVehicle };

interface PortalDashboardContentProps {
  activeDeal: ActiveDealWithContext | null;
  recentInquiries: InquiryWithVehicle[];
  recentRequests: VehicleRequest[];
}

import { BRANDING } from "@/config/branding";

export function PortalDashboardContent({ activeDeal, recentInquiries, recentRequests }: PortalDashboardContentProps) {
  const tenant = useTenant();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
      {/* Active Deal Section (Main Column) */}
      <div className="lg:col-span-8 space-y-12">
        {activeDeal ? (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 border-b-2 border-primary/5 pb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Active Purchase</h3>
            </div>
            
            <div className="bg-white border-2 border-primary/5 rounded-3xl p-8 shadow-[0_15px_35px_-15px_rgba(0,0,0,0.05)] space-y-12">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-48 h-32 rounded-2xl overflow-hidden bg-primary/5 ring-1 ring-primary/5 flex-shrink-0">
                  {activeDeal.vehicle.media[0] ? (
                    <img
                      src={activeDeal.vehicle.media[0].url}
                      alt={`${activeDeal.vehicle.year} ${activeDeal.vehicle.make}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <CarFront className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="space-y-4 flex-grow">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vehicle</p>
                    <p className="text-3xl font-black tracking-tight leading-none uppercase italic">
                      {activeDeal.vehicle.year} {activeDeal.vehicle.make} <span className="text-primary">{activeDeal.vehicle.model}</span>
                    </p>
                    <p className="text-xs font-black text-muted-foreground/50 uppercase tracking-widest ml-1 italic">
                      VIN: {activeDeal.vehicle.vin}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 py-2">
                    <div className="space-y-1 pr-6 border-r border-primary/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price</p>
                      <p className="text-xl font-black tabular-nums tracking-tight italic italic-bold">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(activeDeal.purchasePrice))}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Deposit Paid</p>
                      <p className="text-xl font-black tabular-nums tracking-tight italic italic-bold text-green-600">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(activeDeal.depositAmount || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Milestone Tracker */}
              <MilestoneTracker status={activeDeal.dealStatus} />

              <div className="pt-4 flex flex-wrap gap-4">
                <Button className="rounded-full h-14 px-10 font-black uppercase tracking-widest shadow-xl group">
                  Continue Purchase
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Link href={tenant ? `/${tenant.slug}/inventory/${activeDeal.vehicleId}` : `/inventory/${activeDeal.vehicleId}`}>
                  <Button variant="outline" className="rounded-full h-14 px-8 border-2 font-black uppercase tracking-widest hover:bg-primary/5 transition-all">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-3xl p-16 text-center animate-in fade-in duration-1000">
            <div className="max-w-md mx-auto space-y-6">
              <div className="bg-white p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto shadow-sm ring-1 ring-primary/5">
                <CarFront className="h-10 w-10 text-primary/40" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tight italic">No Active Purchases</h3>
                <p className="text-sm font-medium text-muted-foreground italic leading-relaxed">
                  Browse our hand-picked inventory of premium electric vehicles or request a specific sourcing through our auction network.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href={tenant ? `/${tenant.slug}/inventory` : "/inventory"}>
                  <Button className="rounded-full h-12 px-8 font-black uppercase tracking-widest shadow-lg">
                    Browse Inventory
                  </Button>
                </Link>
                <Link href={tenant ? `/${tenant.slug}/request-vehicle` : "/request-vehicle"}>
                  <Button variant="outline" className="rounded-full h-12 px-8 border-2 font-black uppercase tracking-widest">
                    Request Vehicle
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* History Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Recent Inquiries */}
          <section className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
            <div className="flex items-center gap-3 border-b-2 border-primary/5 pb-4">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight italic">Recent Inquiries</h3>
            </div>
            
            <div className="space-y-4">
              {recentInquiries.length === 0 ? (
                <div className="bg-muted/30 border-2 border-dashed rounded-3xl p-10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
                    No recent inquiries
                  </p>
                </div>
              ) : (
                recentInquiries.map((inquiry) => (
                  <div key={inquiry.id} className="bg-white border-2 border-primary/5 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                          {new Date(inquiry.createdAt).toLocaleDateString()}
                        </p>
                        <p className="font-black uppercase tracking-tight italic group-hover:text-primary transition-colors">
                          {inquiry.vehicle.year} {inquiry.vehicle.make} {inquiry.vehicle.model}
                        </p>
                        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border-2">
                          {INQUIRY_STATUS_LABELS[inquiry.inquiryStatus]}
                        </Badge>
                      </div>
                      <Link href={tenant ? `/${tenant.slug}/inventory/${inquiry.vehicleId}` : `/inventory/${inquiry.vehicleId}`}>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5 hover:text-primary transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recent Requests */}
          <section className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700 delay-300">
            <div className="flex items-center gap-3 border-b-2 border-primary/5 pb-4">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <HistoryIcon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight italic">Vehicle Requests</h3>
            </div>

            <div className="space-y-4">
              {recentRequests.length === 0 ? (
                <div className="bg-muted/30 border-2 border-dashed rounded-3xl p-10 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">
                    No recent requests
                  </p>
                </div>
              ) : (
                recentRequests.map((request) => (
                  <div key={request.id} className="bg-white border-2 border-primary/5 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                        <p className="font-black uppercase tracking-tight italic group-hover:text-primary transition-colors">
                          Sourcing: {request.make} {request.model}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border-2">
                            {REQUEST_STATUS_LABELS[request.requestStatus]}
                          </Badge>
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 italic">
                            Budget: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(request.budgetMax))}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-primary/5 hover:text-primary transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Sidebar / Quick Actions */}
      <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-32 animate-in fade-in slide-in-from-right-4 duration-700 delay-400">
        <Card className="rounded-[2.5rem] border-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] overflow-hidden border-primary/5">
          <CardHeader className="bg-primary/5 pb-8 pt-10 px-10">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl text-primary shadow-sm ring-1 ring-primary/5">
                <FileText className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl font-black uppercase tracking-tight italic italic-bold">Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-10 space-y-8">
            <div className="space-y-6">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assigned Concierge</p>
                <p className="font-black text-lg italic uppercase tracking-tight">{BRANDING.companyName} Concierge</p>
              </div>
              <div className="space-y-4 pt-2">
                <Button className="w-full rounded-full h-14 font-black uppercase tracking-widest shadow-lg group bg-[#1A1A1A] hover:bg-[#2A2A2A]">
                  Email Support
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Link href={tenant ? `/${tenant.slug}/inventory` : "/inventory"} className="block">
                  <Button variant="outline" className="w-full rounded-full h-14 font-black uppercase tracking-widest border-2 hover:bg-primary/5 transition-all">
                    Browse More Cars
                  </Button>
                </Link>
              </div>
            </div>
            <div className="pt-6 border-t-2 border-primary/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-relaxed italic">
                Need help with your purchase or request? Our specialists are available Monday–Friday, 9am–6pm.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
