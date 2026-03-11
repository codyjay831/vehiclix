"use client";

import * as React from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface StripeReservationFormProps {
  dealId: string;
}

export function StripeReservationForm({ dealId }: StripeReservationFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [agreed, setAgreed] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !agreed) return;

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/reservation/${dealId}/confirmation`,
      },
    });

    if (error) {
      toast.error(error.message || "An unexpected error occurred.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-background rounded-3xl p-6 md:p-8 border-2 shadow-sm space-y-6">
        <PaymentElement options={{ layout: "tabs" }} />
        
        <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-2xl border-2 border-transparent hover:border-primary/10 transition-all cursor-pointer" onClick={() => setAgreed(!agreed)}>
          <Checkbox 
            id="agreement" 
            checked={agreed} 
            onCheckedChange={(checked) => setAgreed(!!checked)}
            className="mt-1"
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="agreement"
              className="text-sm font-bold cursor-pointer"
            >
              I understand this is a refundable $1,000 deposit
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This amount will be credited toward your final purchase price. 
              The vehicle will be reserved for 72 hours following a successful deposit.
            </p>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing || !agreed}
        size="lg"
        className="w-full h-16 rounded-full text-lg font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-primary/20 transition-all group"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Place $1,000 Deposit
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center uppercase font-black tracking-widest flex items-center justify-center gap-2">
        <ShieldCheck className="h-3 w-3" />
        Secure Stripe Encryption • Encrypted Transaction
      </p>
    </form>
  );
}
