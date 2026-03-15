"use client";

import { useState } from "react";
import { OrganizationSubscription, SubscriptionStatus, PlanKey } from "@prisma/client";
import { BILLING_PLANS } from "@/config/billing";
import { createCheckoutSessionAction, createBillingPortalAction } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2, ExternalLink, CreditCard, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface BillingManagementProps {
  subscription: OrganizationSubscription | null;
}

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  ACTIVE: "bg-green-500/10 text-green-600 border-green-200",
  TRIALING: "bg-blue-500/10 text-blue-600 border-blue-200",
  PAST_DUE: "bg-orange-500/10 text-orange-600 border-orange-200",
  CANCELED: "bg-slate-500/10 text-slate-600 border-slate-200",
  INCOMPLETE: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  NONE: "bg-slate-500/10 text-slate-600 border-slate-200",
};

export function BillingManagement({ subscription }: BillingManagementProps) {
  const [isLoading, setIsLoading] = useState<PlanKey | "portal" | null>(null);

  const handleCheckout = async (planKey: PlanKey) => {
    setIsLoading(planKey);
    try {
      const result = await createCheckoutSessionAction(planKey);
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout session.");
      setIsLoading(null);
    }
  };

  const handlePortal = async () => {
    setIsLoading("portal");
    try {
      const result = await createBillingPortalAction();
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to launch billing portal.");
      setIsLoading(null);
    }
  };

  const currentPlan = subscription?.planKey;
  const status = subscription?.status || SubscriptionStatus.NONE;

  return (
    <div className="space-y-8">
      {/* Current Status Card */}
      <Card className="rounded-2xl border-2 overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-3 w-3 text-primary" />
                Current Subscription
              </CardTitle>
              <CardDescription className="text-lg font-black uppercase tracking-tighter italic text-foreground">
                {currentPlan ? BILLING_PLANS[currentPlan].name : "No Plan Selected"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={cn("font-black uppercase tracking-widest text-[10px] border", STATUS_COLORS[status])} variant="outline">
                {status}
              </Badge>
              {subscription?.stripeCustomerId && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="font-black uppercase tracking-widest text-[10px] italic h-9 gap-2"
                  onClick={handlePortal}
                  disabled={isLoading !== null}
                >
                  {isLoading === "portal" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
                  Manage Billing
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Renewal Date</p>
              <p className="font-bold text-sm italic">
                {subscription?.currentPeriodEnd 
                  ? format(new Date(subscription.currentPeriodEnd), "PPP") 
                  : subscription?.trialEndsAt 
                    ? format(new Date(subscription.trialEndsAt), "PPP")
                    : "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stripe ID</p>
              <p className="font-bold text-sm italic font-mono truncate max-w-[150px]">
                {subscription?.stripeCustomerId || "None"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cancel Status</p>
              <p className="font-bold text-sm italic">
                {subscription?.cancelAtPeriodEnd ? "Canceled at end of period" : "Auto-renewing"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Selection */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-xl font-black uppercase tracking-tighter italic">
            Select <span className="text-primary">Your Plan</span>
          </h3>
          <p className="text-sm text-muted-foreground font-medium">
            Choose the tier that best fits your dealership's operational needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(BILLING_PLANS).map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <Card 
                key={plan.key} 
                className={cn(
                  "rounded-2xl border-2 transition-all flex flex-col",
                  isCurrent ? "border-primary shadow-xl shadow-primary/5" : "border-border hover:border-primary/20"
                )}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      {plan.key === PlanKey.PRO && <Sparkles className="h-4 w-4 text-primary" />}
                      {plan.key === PlanKey.PREMIUM && <ShieldCheck className="h-4 w-4 text-primary" />}
                      {plan.name}
                    </CardTitle>
                    {isCurrent && (
                      <Badge className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[8px] h-4">Current</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs font-medium min-h-[32px]">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] font-bold uppercase tracking-tight">
                        <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-4 border-t bg-muted/10">
                  <Button 
                    className="w-full font-black uppercase tracking-widest text-xs italic h-11 rounded-xl"
                    variant={isCurrent ? "outline" : "default"}
                    onClick={() => handleCheckout(plan.key)}
                    disabled={isLoading !== null || isCurrent}
                  >
                    {isLoading === plan.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      "Your Current Plan"
                    ) : (
                      `Select ${plan.name}`
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
