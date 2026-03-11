import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminDealDetail, getDealActivity } from "@/lib/deal";
import { DEAL_STATUS_LABELS, VEHICLE_STATUS_LABELS } from "@/types";
import { DealStatus, VehicleStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  Clock, 
  UserCircle,
  CarFront,
  ShieldCheck,
  CircleAlert,
  ArrowRight,
  CreditCard,
  History,
  XCircle,
  CheckCircle2,
  Calendar,
  FileSignature,
  Fingerprint
} from "lucide-react";
import { updateDealStatusAction, cancelDealAction, initiateDocuSignAction } from "@/actions/deal";
import { DocumentReviewSection } from "@/components/admin/DocumentReviewSection";
import { DocumentStatus, EnvelopeStatus } from "@prisma/client";

interface DealDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminDealDetailPage({ params }: DealDetailPageProps) {
  const { id } = await params;
  const deal = await getAdminDealDetail(id);
  const activity = await getDealActivity(id);

  if (!deal) {
    notFound();
  }

  const NEXT_STEPS: Record<string, { label: string; status: DealStatus }> = {
    [DealStatus.DEPOSIT_RECEIVED]: { label: "Request Documents", status: DealStatus.DOCUMENTS_PENDING },
    [DealStatus.DOCUMENTS_PENDING]: { label: "Send Contracts", status: DealStatus.CONTRACTS_SENT },
    [DealStatus.CONTRACTS_SENT]: { label: "Confirm Signatures", status: DealStatus.CONTRACTS_SIGNED },
    [DealStatus.CONTRACTS_SIGNED]: { label: "Set Financing Pending", status: DealStatus.FINANCING_PENDING },
    [DealStatus.FINANCING_PENDING]: { label: "Mark Ready for Delivery", status: DealStatus.READY_FOR_DELIVERY },
    [DealStatus.READY_FOR_DELIVERY]: { label: "Complete Transaction", status: DealStatus.COMPLETED },
  };

  const nextStep = NEXT_STEPS[deal.dealStatus];
  const isFinalState = deal.dealStatus === DealStatus.COMPLETED || deal.dealStatus === DealStatus.CANCELLED;
  const isCancellable = !isFinalState && deal.dealStatus !== DealStatus.LEAD && deal.dealStatus !== DealStatus.DEPOSIT_PENDING;

  // DocuSign Preconditions
  const allDocsVerified = deal.documents.length > 0 && deal.documents.every(doc => doc.documentStatus === DocumentStatus.VERIFIED);
  const hasActiveEnvelope = deal.envelopes.some(env => ([EnvelopeStatus.SENT, EnvelopeStatus.DELIVERED] as string[]).includes(env.envelopeStatus));
  const canSendContracts = deal.dealStatus === DealStatus.DOCUMENTS_PENDING && allDocsVerified && !hasActiveEnvelope;

  const latestEnvelope = deal.envelopes[0];

  return (
    <div className="p-6 lg:p-12 space-y-12 max-w-6xl mx-auto">
      {/* Header & Navigation */}
      <div className="flex flex-col space-y-6">
        <Link href="/admin/deals">
          <Button variant="ghost" size="sm" className="pl-0 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-transparent hover:text-primary transition-colors">
            <ChevronLeft className="mr-1 h-3 w-3" />
            Back to Deals
          </Button>
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge 
                variant={deal.user.isStub ? "secondary" : "default"}
                className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full"
              >
                {deal.user.isStub ? "Guest Buyer" : "Registered Customer"}
              </Badge>
              <Badge 
                variant={deal.dealStatus === DealStatus.COMPLETED ? "default" : "outline"}
                className={`uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border-2 ${deal.dealStatus === DealStatus.COMPLETED ? "bg-green-100 text-green-700 border-green-200" : ""}`}
              >
                {DEAL_STATUS_LABELS[deal.dealStatus]}
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase leading-[0.9] italic">
              Deal: <span className="text-primary">#{deal.id.split("-")[0]}</span>
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              Initiated on {new Date(deal.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Timeline (Milestone Tracker) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { label: "Deposit", states: [DealStatus.DEPOSIT_RECEIVED] },
          { label: "Documents", states: [DealStatus.DOCUMENTS_PENDING] },
          { label: "Contract", states: [DealStatus.CONTRACTS_SENT, DealStatus.CONTRACTS_SIGNED] },
          { label: "Delivery", states: [DealStatus.FINANCING_PENDING, DealStatus.READY_FOR_DELIVERY, DealStatus.COMPLETED] }
        ] as { label: string; states: DealStatus[] }[]).map((milestone, idx) => {
          const isActive = milestone.states.includes(deal.dealStatus);
          const isPast = !isActive && idx < ([
            [DealStatus.DEPOSIT_RECEIVED],
            [DealStatus.DOCUMENTS_PENDING],
            [DealStatus.CONTRACTS_SENT, DealStatus.CONTRACTS_SIGNED],
            [DealStatus.FINANCING_PENDING, DealStatus.READY_FOR_DELIVERY, DealStatus.COMPLETED]
          ] as DealStatus[][]).findIndex(m => m.includes(deal.dealStatus));
          
          return (
            <div key={milestone.label} className="relative">
              <div className={`h-2 rounded-full ${isActive ? "bg-primary" : isPast ? "bg-primary/40" : "bg-muted"}`} />
              <p className={`mt-2 text-[10px] font-black uppercase tracking-widest ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {milestone.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-12">
          {/* Workflow Section */}
          {!isFinalState && (
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b-2 pb-6">
                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight italic">Transaction Workflow</h3>
              </div>
              <div className="bg-background border-2 rounded-3xl p-8 shadow-sm space-y-8">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground italic">Current Stage: {DEAL_STATUS_LABELS[deal.dealStatus]}</p>
                  <p className="text-lg font-bold">What is the next step for this purchase?</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  {nextStep && (
                    <form action={async () => { "use server"; await updateDealStatusAction(deal.id, nextStep.status); }}>
                      <Button type="submit" size="lg" className="rounded-full h-14 px-8 font-black uppercase tracking-widest shadow-xl group">
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        {nextStep.label}
                      </Button>
                    </form>
                  )}
                  {isCancellable && (
                    <form action={async () => { "use server"; await cancelDealAction(deal.id); }}>
                      <Button type="submit" variant="outline" size="lg" className="rounded-full h-14 px-8 font-black uppercase tracking-widest border-2 border-destructive text-destructive hover:bg-destructive hover:text-white transition-all">
                        <XCircle className="mr-2 h-5 w-5" />
                        Cancel Deal
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Deposit Metadata */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Reservation Deposit</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {deal.deposits.length === 0 ? (
                <div className="sm:col-span-2 bg-muted/30 border-2 border-dashed rounded-3xl p-12 text-center">
                  <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest italic">No deposit records found.</p>
                </div>
              ) : (
                deal.deposits.map((deposit) => (
                  <Card key={deposit.id} className="rounded-2xl border-2 shadow-none overflow-hidden border-primary/10 bg-primary/5">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount Paid</p>
                          <p className="text-2xl font-black tabular-nums">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(deposit.depositAmount))}
                          </p>
                        </div>
                        <Badge className="bg-green-100 text-green-700 border-green-200 uppercase text-[10px] font-black px-2 py-0.5 rounded-full">{deposit.paymentStatus}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stripe ID</p>
                        <p className="font-mono text-xs truncate text-muted-foreground">{deposit.stripePaymentId || "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Timestamp</p>
                        <p className="text-xs font-bold">{deposit.paymentTimestamp ? new Date(deposit.paymentTimestamp).toLocaleString() : "N/A"}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>

          {/* Document Review Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Document Verification</h3>
            </div>
            <DocumentReviewSection documents={deal.documents} />
          </section>

          {/* E-Signature Progress Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <FileSignature className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">E-Signature Progress</h3>
            </div>
            
            <div className="bg-background border-2 rounded-3xl p-8 shadow-sm space-y-8">
              {latestEnvelope ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="h-4 w-4 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latest Envelope ID</p>
                    </div>
                    <p className="font-mono text-xs break-all bg-muted p-3 rounded-xl border border-primary/5">{latestEnvelope.envelopeId}</p>
                    <div className="flex items-center gap-2 pt-2">
                      <Badge 
                        variant={latestEnvelope.envelopeStatus === EnvelopeStatus.COMPLETED ? "default" : "outline"}
                        className={`uppercase text-[10px] font-black tracking-widest px-3 py-1 rounded-full border-2 ${latestEnvelope.envelopeStatus === EnvelopeStatus.COMPLETED ? "bg-green-100 text-green-700 border-green-200" : ""}`}
                      >
                        {latestEnvelope.envelopeStatus}
                      </Badge>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase italic tracking-tight">
                        Sent on {new Date(latestEnvelope.sentAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center space-y-4 bg-primary/5 rounded-2xl p-6 border border-primary/10 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">External Status</p>
                    <p className="text-sm font-bold text-muted-foreground leading-relaxed italic">
                      {latestEnvelope.envelopeStatus === EnvelopeStatus.COMPLETED 
                        ? "Contracts have been digitally signed by all parties." 
                        : "Waiting for DocuSign Connect webhook to confirm signatures."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                  <div className="bg-muted p-4 rounded-full">
                    <FileSignature className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold uppercase tracking-tight">No Contracts Sent</p>
                    <p className="text-xs text-muted-foreground italic max-w-xs mx-auto">
                      Purchase agreements can be sent once all customer documentation is verified.
                    </p>
                  </div>
                </div>
              )}

              {canSendContracts && (
                <div className="pt-4 border-t-2 border-primary/5 flex justify-center">
                  <form action={async () => { "use server"; await initiateDocuSignAction(deal.id); }}>
                    <Button type="submit" size="lg" className="rounded-full h-14 px-10 font-black uppercase tracking-widest shadow-xl group">
                      <FileSignature className="mr-2 h-5 w-5" />
                      Send Purchase Agreement
                    </Button>
                  </form>
                </div>
              )}

              {!allDocsVerified && deal.dealStatus === DealStatus.DOCUMENTS_PENDING && (
                <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 flex items-center gap-3">
                  <CircleAlert className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <p className="text-[10px] font-black uppercase tracking-tight text-amber-800">
                    Verify all documents above to enable e-signature initiation.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Activity Log */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <History className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Status History</h3>
            </div>
            <div className="bg-muted/30 border-2 rounded-3xl p-8 space-y-6">
              {activity.length === 0 ? (
                <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest italic text-center py-4">No status changes recorded.</p>
              ) : (
                activity.map((event) => (
                  <div key={event.id} className="flex gap-4 group">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/10" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold uppercase tracking-tight">{event.eventType.split('.').join(' ')}</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {new Date(event.createdAt).toLocaleString()} by Dealership Admin
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8">
          {/* Customer Card */}
          <Card className="rounded-3xl border-2 shadow-none overflow-hidden border-primary/10">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-lg text-primary shadow-sm">
                  <UserCircle className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-black uppercase tracking-tight italic">Customer</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Name</p>
                <p className="font-bold text-lg">{deal.user.firstName} {deal.user.lastName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</p>
                <a href={`mailto:${deal.user.email}`} className="flex items-center gap-2 font-bold text-base hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-primary" />
                  {deal.user.email}
                </a>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone</p>
                <a href={`tel:${deal.user.phone}`} className="flex items-center gap-2 font-bold text-base hover:text-primary transition-colors">
                  <Phone className="h-4 w-4 text-primary" />
                  {deal.user.phone || "Not provided"}
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Context Card */}
          <Card className="rounded-3xl border-2 shadow-none overflow-hidden border-primary/10">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-lg text-primary shadow-sm">
                  <CarFront className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-black uppercase tracking-tight italic">Vehicle</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Car</p>
                <p className="font-bold text-lg">{deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}</p>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">VIN: {deal.vehicle.vin}</p>
              </div>
              <div className="flex justify-between items-center py-4 border-y border-dashed border-primary/20">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sale Price</p>
                  <p className="font-black text-xl tabular-nums">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(deal.purchasePrice))}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vehicle Status</p>
                  <Badge variant="outline" className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border-2">
                    {deal.vehicle.vehicleStatus}
                  </Badge>
                </div>
              </div>
              <Link href={`/admin/inventory/${deal.vehicleId}`}>
                <Button className="w-full rounded-full h-14 font-black uppercase tracking-widest shadow-lg group">
                  View Inventory Record
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
