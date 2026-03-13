import * as React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAdminRequestDetail } from "@/lib/request";
import { REQUEST_STATUS_LABELS } from "@/types";
import { VehicleRequestStatus, Priority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { requireUserWithOrg } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  Clock, 
  UserCircle,
  ShieldCheck,
  CircleAlert,
  Save,
  CheckCircle2,
  XCircle,
  Search,
  DollarSign,
  Calendar,
  Zap,
  Tag,
  ArrowRight,
  ClipboardList
} from "lucide-react";
import { updateRequestStatusAction, updateRequestPriorityAction, updateRequestNotesAction } from "@/actions/request";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RequestDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminRequestDetailPage({ params }: RequestDetailPageProps) {
  const user = await requireUserWithOrg();
  const { id } = await params;
  const request = await getAdminRequestDetail(user.organizationId, id);

  if (!request) {
    notFound();
  }

  const handleStatusUpdate = async (newStatus: VehicleRequestStatus) => {
    "use server";
    await updateRequestStatusAction(id, newStatus);
  };

  const handlePriorityUpdate = async (priority: Priority) => {
    "use server";
    await updateRequestPriorityAction(id, priority);
  };

  const handleSaveNotes = async (formData: FormData) => {
    "use server";
    const notes = formData.get("notes") as string;
    await updateRequestNotesAction(id, notes);
  };

  const isGuest = request.user.isStub;

  const specItems = [
    { label: "Make", value: request.make, icon: Tag },
    { label: "Model", value: request.model, icon: Tag },
    { label: "Year Range", value: `${request.yearMin || "?"} - ${request.yearMax || "?"}`, icon: Calendar },
    { label: "Max Budget", value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(request.budgetMax)), icon: DollarSign },
    { label: "Max Mileage", value: request.mileageMax ? `${request.mileageMax.toLocaleString()} mi` : "No limit", icon: Zap },
    { label: "Color Prefs", value: request.colorPrefs || "None specified", icon: Zap },
    { label: "Features", value: request.features || "None specified", icon: Zap },
    { label: "Timeline", value: request.timeline || "No rush", icon: Clock },
  ];

  return (
    <div className="p-6 lg:p-12 space-y-12 max-w-6xl mx-auto">
      {/* Header & Navigation */}
      <div className="flex flex-col space-y-6">
        <Button asChild variant="ghost" size="sm" className="pl-0 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-transparent hover:text-primary transition-colors">
          <Link href="/admin/requests">
            <ChevronLeft className="mr-1 h-3 w-3" />
            Back to Requests
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
                variant={request.requestStatus === VehicleRequestStatus.SUBMITTED ? "default" : "outline"}
                className="uppercase text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border-2"
              >
                {REQUEST_STATUS_LABELS[request.requestStatus]}
              </Badge>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase leading-[0.9] italic">
              {request.user.firstName} <span className="text-primary">{request.user.lastName}</span>
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Clock className="h-4 w-4 text-primary" />
              Requested on {new Date(request.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-12">
          {/* Preferences Grid */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Vehicle Preferences</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {specItems.map((item) => (
                <div key={item.label} className="bg-muted/30 border-2 border-transparent rounded-2xl p-5 flex items-center gap-4">
                  <div className="bg-background p-2 rounded-lg text-primary shadow-sm">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
                    <p className="font-bold text-base truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <Card className="rounded-2xl border-2 shadow-none overflow-hidden bg-primary/5 border-primary/10">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${request.tradeInInterest ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trade-In Interest</h4>
                    <p className="font-bold uppercase text-sm tracking-tight">{request.tradeInInterest ? "Yes, has trade" : "No trade-in"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-2 shadow-none overflow-hidden bg-primary/5 border-primary/10">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${request.financingInterest ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Financing Interest</h4>
                    <p className="font-bold uppercase text-sm tracking-tight">{request.financingInterest ? "Yes, needs financing" : "No financing"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {request.notes && (
              <div className="pt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 ml-1">Customer Notes</p>
                <div className="bg-background border-2 rounded-2xl p-6 italic font-medium text-muted-foreground">
                  "{request.notes}"
                </div>
              </div>
            )}
          </section>

          {/* Proposals List (Read-Only) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 pb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Sent Proposals</h3>
            </div>
            <div className="space-y-4">
              {request.proposals.length === 0 ? (
                <div className="bg-muted/30 border-2 border-dashed rounded-3xl p-12 text-center">
                  <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest italic">No proposals sent yet.</p>
                </div>
              ) : (
                request.proposals.map((proposal) => (
                  <div key={proposal.id} className="bg-background border-2 rounded-2xl p-6 flex justify-between items-center group">
                    <div className="space-y-1">
                      <p className="font-bold text-lg">{proposal.year} {proposal.make} {proposal.model}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                        <span>{proposal.mileage.toLocaleString()} mi</span>
                        <span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(proposal.estimatedPrice))}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="uppercase text-[10px] font-black tracking-widest border-2">
                      {proposal.proposalStatus}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8">
          {/* Status & Priority Management */}
          <Card className="rounded-3xl border-2 shadow-none overflow-hidden border-primary/10">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-lg text-primary shadow-sm">
                  <CircleAlert className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-black uppercase tracking-tight italic">Workspace</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {/* Priority Selector */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-center">Internal Priority</p>
                <div className="grid grid-cols-3 gap-2">
                  {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map((p) => (
                    <form key={p} action={async () => { "use server"; await handlePriorityUpdate(p); }}>
                      <Button 
                        type="submit"
                        variant={request.priority === p ? "default" : "outline"}
                        size="sm"
                        className={`w-full rounded-full font-black uppercase text-[10px] tracking-widest h-10 ${
                          request.priority === p 
                            ? p === Priority.HIGH ? "bg-red-600 hover:bg-red-700" : p === Priority.MEDIUM ? "bg-amber-500 hover:bg-amber-600" : ""
                            : ""
                        }`}
                      >
                        {p}
                      </Button>
                    </form>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border border-dashed" />

              {/* Status Actions */}
              <div className="space-y-4">
                {request.requestStatus === VehicleRequestStatus.SUBMITTED && (
                  <form action={async () => { "use server"; await handleStatusUpdate(VehicleRequestStatus.UNDER_REVIEW); }}>
                    <Button type="submit" className="w-full rounded-full h-14 font-black uppercase tracking-widest shadow-lg group">
                      <CheckCircle2 className="mr-2 h-5 w-5 text-primary-foreground" />
                      Mark Under Review
                    </Button>
                  </form>
                )}
                {request.requestStatus === VehicleRequestStatus.UNDER_REVIEW && (
                  <form action={async () => { "use server"; await handleStatusUpdate(VehicleRequestStatus.SOURCING); }}>
                    <Button type="submit" className="w-full rounded-full h-14 font-black uppercase tracking-widest shadow-lg group">
                      <Search className="mr-2 h-5 w-5" />
                      Start Sourcing
                    </Button>
                  </form>
                )}
                {request.requestStatus !== VehicleRequestStatus.CLOSED && 
                 request.requestStatus !== VehicleRequestStatus.CONVERTED_TO_DEAL && (
                  <form action={async () => { "use server"; await handleStatusUpdate(VehicleRequestStatus.CLOSED); }}>
                    <Button type="submit" variant="outline" className="w-full rounded-full h-14 font-black uppercase tracking-widest border-2 border-destructive text-destructive hover:bg-destructive hover:text-white transition-all">
                      <XCircle className="mr-2 h-5 w-5" />
                      Close Request
                    </Button>
                  </form>
                )}
                {request.requestStatus === VehicleRequestStatus.CLOSED && (
                  <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest italic text-center py-4 border-2 border-dashed rounded-2xl">
                    This request is closed.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card className="rounded-3xl border-2 shadow-none overflow-hidden border-primary/10">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-lg text-primary shadow-sm">
                  <Save className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-black uppercase tracking-tight italic">Internal Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <form action={handleSaveNotes} className="space-y-4">
                <Textarea 
                  name="notes" 
                  placeholder="Strategy, auction links, pricing..."
                  className="min-h-[150px] rounded-2xl border-2 p-4 shadow-sm text-sm font-medium"
                  defaultValue={request.ownerNotes || ""}
                />
                <Button type="submit" size="sm" className="w-full rounded-full font-black uppercase tracking-widest">
                  <Save className="mr-2 h-4 w-4" />
                  Save Notes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Card */}
          <Card className="rounded-3xl border-2 shadow-none overflow-hidden border-primary/10">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="bg-background p-2 rounded-lg text-primary shadow-sm">
                  <UserCircle className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-black uppercase tracking-tight italic">Contact Customer</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</p>
                <a href={`mailto:${request.user.email}`} className="flex items-center gap-2 font-bold text-base hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-primary" />
                  {request.user.email}
                </a>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone</p>
                <a href={`tel:${request.user.phone}`} className="flex items-center gap-2 font-bold text-base hover:text-primary transition-colors">
                  <Phone className="h-4 w-4 text-primary" />
                  {request.user.phone || "Not provided"}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
