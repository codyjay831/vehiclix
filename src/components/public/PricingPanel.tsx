import * as React from "react";
import Link from "next/link";
import { Vehicle } from "@/types";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, MessageSquare } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InquiryModal } from "./InquiryModal";

interface PricingPanelProps {
  vehicle: Vehicle;
}

export function PricingPanel({ vehicle }: PricingPanelProps) {
  const [isInquiryOpen, setIsInquiryOpen] = React.useState(false);

  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(vehicle.price));

  return (
    <Card className="sticky top-24 border-2 shadow-xl rounded-2xl overflow-hidden group">
      <CardHeader className="bg-primary/5 pb-6 text-center">
        <CardTitle className="text-3xl font-black tracking-tighter uppercase tabular-nums">
          {formattedPrice}
        </CardTitle>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium pt-2">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <span>Transparent Pricing</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-8 p-6">
        <div className="space-y-4">
          <div className="p-4 bg-muted/40 rounded-xl border-2 border-dashed border-primary/20 space-y-2">
            <h4 className="text-sm font-bold tracking-tight uppercase tracking-widest text-primary">
              Reservation Deposit
            </h4>
            <p className="text-2xl font-black">$500 – $1,000</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Fully refundable. Credited toward your final purchase price. 
              Secures the vehicle for your inspection.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link href={`/inventory/${vehicle.id}/reserve`} className="w-full">
            <Button size="lg" className="w-full h-14 rounded-full text-lg font-black shadow-lg hover:shadow-primary/20 transition-all group">
              Reserve Now
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full h-14 rounded-full border-2 hover:bg-muted font-bold group"
            onClick={() => setIsInquiryOpen(true)}
          >
            <MessageSquare className="mr-2 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            Ask About Vehicle
          </Button>
        </div>

        <InquiryModal 
          vehicle={vehicle} 
          open={isInquiryOpen} 
          onOpenChange={setIsInquiryOpen} 
        />
      </CardContent>
      
      <CardFooter className="bg-muted/10 p-4 text-center border-t">
        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest w-full">
          No Hidden Fees • Certified EV • 7-Day Return
        </p>
      </CardFooter>
    </Card>
  );
}
