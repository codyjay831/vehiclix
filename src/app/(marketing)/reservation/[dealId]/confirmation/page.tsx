import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getDefaultOrganization } from "@/lib/organization";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Mail, LayoutDashboard, CarFront } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BRANDING } from "@/config/branding";

interface ConfirmationPageProps {
  params: Promise<{ dealId: string }>;
}

export default async function ReservationConfirmationPage({ params }: ConfirmationPageProps) {
  const { dealId } = await params;
  const org = await getDefaultOrganization();

  const deal = await db.deal.findFirst({
    where: { 
      id: dealId,
      organizationId: org.id
    },
    include: {
      vehicle: true,
      user: true,
    },
  });

  if (!deal) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/10 pt-32 pb-20 px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col items-center justify-center max-w-3xl mx-auto text-center space-y-12">
        <div className="bg-green-100 p-6 rounded-full">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            Vehicle <br /><span className="text-primary">Reserved!</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
            Your {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model} is now held for you.
          </p>
        </div>

        {/* Reservation Summary */}
        <Card className="w-full rounded-3xl border-2 shadow-none overflow-hidden bg-background">
          <CardContent className="p-8 md:p-10 space-y-8 text-left">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary">Reservation Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vehicle</p>
                <p className="font-bold text-lg">{deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deposit Paid</p>
                <p className="font-bold text-lg">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(deal.depositAmount))}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reservation Date</p>
                <p className="font-bold text-lg">{deal.createdAt.toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Confirmation ID</p>
                <p className="font-mono text-sm uppercase">{deal.id.split("-")[0]}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <div className="w-full bg-primary/5 rounded-3xl p-10 md:p-12 border-2 border-primary/10 space-y-8 text-left">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-primary text-center md:text-left">Your Path to Ownership</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="w-8 h-8 bg-background rounded-full border-2 flex items-center justify-center font-black text-primary text-xs">1</div>
              <h4 className="font-black uppercase text-xs tracking-tight">Create Account</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Enter your portal to start the document upload process.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-background rounded-full border-2 flex items-center justify-center font-black text-primary text-xs">2</div>
              <h4 className="font-black uppercase text-xs tracking-tight">Upload Docs</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Provide your driver's license and proof of insurance for verification.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 bg-background rounded-full border-2 flex items-center justify-center font-black text-primary text-xs">3</div>
              <h4 className="font-black uppercase text-xs tracking-tight">Digital Signature</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Sign your purchase agreement securely via DocuSign.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
          <Link href="/login" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto h-16 px-12 rounded-full font-black uppercase tracking-widest shadow-xl group">
              Access My Portal
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link href="/inventory" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-16 px-12 rounded-full font-bold uppercase tracking-widest border-2">
              Back to Showroom
            </Button>
          </Link>
        </div>

        <div className="pt-12 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <Mail className="h-3 w-3 text-primary" />
          Questions? {BRANDING.contact.email}
        </div>
      </div>
    </div>
  );
}
