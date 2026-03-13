import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getInquiryDetail } from "@/lib/inquiry";
import { INQUIRY_STATUS_LABELS, CONTACT_METHOD_LABELS } from "@/types";
import { InquiryStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { requireUserWithOrg } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  MessageSquare, 
  CarFront, 
  Clock, 
  UserCircle,
  ShieldCheck,
  CircleAlert,
  Save,
  CheckCircle2,
  Trash2,
  XCircle
} from "lucide-react";
import { updateInquiryStatusAction, updateInquiryNotesAction } from "@/actions/inquiry";
import { Textarea } from "@/components/ui/textarea";

interface InquiryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminInquiryDetailPage({ params }: InquiryDetailPageProps) {
  const user = await requireUserWithOrg();
  const { id } = await params;
  const inquiry = await getInquiryDetail(user.organizationId, id);

  if (!inquiry) {
    notFound();
  }

  const handleStatusUpdate = async (newStatus: InquiryStatus) => {
    "use server";
    await updateInquiryStatusAction(id, newStatus);
  };

  const handleSaveNotes = async (formData: FormData) => {
    "use server";
    const notes = formData.get("notes") as string;
    await updateInquiryNotesAction(id, notes);
  };

  const isGuest = inquiry.user?.isStub !== false;

  return (
    <div className="p-6 lg:p-12 space-y-12 max-w-6xl mx-auto">
      {/* Header & Navigation */}
      <div className="flex flex-col space-y-6">
        <Button asChild variant="ghost" size="sm" className="pl-0 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-transparent hover:text-primary transition-colors">
          <Link href="/admin/inquiries">
            <ChevronLeft className="mr-1 h-3 w-3" />
            Back to Inquiries
          </Link>
        </Button>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge 
                variant={isGuest ? "secondary" : "default"}
                className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full"
              >
                {isGuest ? "Guest Lead" : "Registered Customer"}
              </Badge>
              <Badge 
                variant={inquiry.inquiryStatus === InquiryStatus.NEW ? "default" : "outline"}
                className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border-2"
              >
                {INQUIRY_STATUS_LABELS[inquiry.inquiryStatus]}
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase leading-[0.9] italic">
              {inquiry.firstName} <span className="text-primary">{inquiry.lastName}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Submitted on {new Date(inquiry.createdAt).toLocaleDateString()} at {new Date(inquiry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Prefers {CONTACT_METHOD_LABELS[inquiry.preferredContact]}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-12">
          {/* Customer Message */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Customer Message</h3>
            </div>
            <div className="bg-background border-2 rounded-3xl p-8 shadow-sm">
              <p className="text-lg leading-relaxed font-medium text-foreground whitespace-pre-wrap italic">
                "{inquiry.message || "No message provided."}"
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <Card className="rounded-2xl border-2 shadow-none overflow-hidden bg-primary/5 border-primary/10">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${inquiry.tradeInInterest ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trade-In Interest</h4>
                    <p className="font-bold uppercase text-sm tracking-tight">{inquiry.tradeInInterest ? "Yes, customer has trade" : "No trade-in mentioned"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-2 shadow-none overflow-hidden bg-primary/5 border-primary/10">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${inquiry.financingInterest ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Financing Interest</h4>
                    <p className="font-bold uppercase text-sm tracking-tight">{inquiry.financingInterest ? "Yes, wants financing options" : "No financing mentioned"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Status Actions */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <CircleAlert className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Status Management</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {inquiry.inquiryStatus === InquiryStatus.NEW && (
                <form action={async () => { "use server"; await handleStatusUpdate(InquiryStatus.REVIEWED); }}>
                  <Button type="submit" size="lg" className="rounded-full h-14 px-8 font-black uppercase tracking-widest shadow-xl group">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Mark as Reviewed
                  </Button>
                </form>
              )}
              {inquiry.inquiryStatus === InquiryStatus.REVIEWED && (
                <form action={async () => { "use server"; await handleStatusUpdate(InquiryStatus.RESPONDED); }}>
                  <Button type="submit" size="lg" className="rounded-full h-14 px-8 font-black uppercase tracking-widest shadow-xl group">
                    <Mail className="mr-2 h-5 w-5" />
                    Mark as Responded
                  </Button>
                </form>
              )}
              {inquiry.inquiryStatus !== InquiryStatus.CLOSED && inquiry.inquiryStatus !== InquiryStatus.CONVERTED && (
                <form action={async () => { "use server"; await handleStatusUpdate(InquiryStatus.CLOSED); }}>
                  <Button type="submit" variant="outline" size="lg" className="rounded-full h-14 px-8 font-black uppercase tracking-widest border-2 border-destructive text-destructive hover:bg-destructive hover:text-white transition-all">
                    <XCircle className="mr-2 h-5 w-5" />
                    Close Inquiry
                  </Button>
                </form>
              )}
              {inquiry.inquiryStatus === InquiryStatus.CLOSED && (
                <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest italic flex items-center gap-2 border-2 border-muted px-6 py-4 rounded-full">
                  <XCircle className="h-4 w-4" />
                  This inquiry has been closed.
                </p>
              )}
            </div>
          </section>

          {/* Internal Notes */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <Save className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Owner Workspace</h3>
            </div>
            <form action={handleSaveNotes} className="space-y-4">
              <Textarea 
                name="notes" 
                placeholder="Add internal notes about this inquiry, customer interaction, or follow-up strategy..."
                className="min-h-[200px] rounded-3xl border-2 p-6 shadow-sm focus-visible:ring-primary focus-visible:border-primary text-base font-medium"
                defaultValue={inquiry.ownerNotes || ""}
              />
              <div className="flex justify-end">
                <Button type="submit" className="rounded-full px-8 h-12 font-black uppercase tracking-widest shadow-lg">
                  <Save className="mr-2 h-4 w-4" />
                  Save Notes
                </Button>
              </div>
            </form>
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
                <CardTitle className="text-lg font-black uppercase tracking-tight italic">Customer Contact</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-2 group">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Email Address</p>
                <a href={`mailto:${inquiry.email}`} className="flex items-center gap-3 font-bold text-lg hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-primary" />
                  {inquiry.email}
                </a>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Phone Number</p>
                <a href={`tel:${inquiry.phone}`} className="flex items-center gap-3 font-bold text-lg hover:text-primary transition-colors">
                  <Phone className="h-4 w-4 text-primary" />
                  {inquiry.phone}
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
                <CardTitle className="text-lg font-black uppercase tracking-tight italic">Vehicle Context</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Vehicle</p>
                <p className="font-bold text-lg">{inquiry.vehicle.year} {inquiry.vehicle.make} {inquiry.vehicle.model}</p>
                {inquiry.vehicle.trim && (
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{inquiry.vehicle.trim}</p>
                )}
              </div>
              <div className="flex justify-between items-center py-4 border-y border-dashed border-primary/20">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Price</p>
                  <p className="font-black text-xl tabular-nums">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(inquiry.vehicle.price))}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Current Status</p>
                  <Badge variant="outline" className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border-2">
                    {inquiry.vehicle.vehicleStatus}
                  </Badge>
                </div>
              </div>
              <Button asChild className="w-full rounded-full h-14 font-black uppercase tracking-widest shadow-lg group">
                <Link href={`/admin/inventory/${inquiry.vehicleId}`}>
                  Edit Vehicle
                  <ChevronLeft className="ml-2 h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
