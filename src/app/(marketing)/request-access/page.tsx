"use client";

import * as React from "react";
import { submitBetaRequestAction } from "@/actions/beta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CarFront, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { storefrontAuthBridgeHref } from "@/lib/storefront-auth-bridge";

export default function RequestAccessPage() {
  const pathname = usePathname();
  const [isPending, setIsPending] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await submitBetaRequestAction(formData);

    if (result.error) {
      setError(result.error);
      setIsPending(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-3xl p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight italic">Request Received</h1>
            <p className="text-muted-foreground font-medium">
              Thank you for your interest. Our team will review your application and contact you via email once approved.
            </p>
          </div>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full rounded-full">Back to Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="bg-primary p-2 rounded-xl group-hover:rotate-3 transition-transform">
              <CarFront className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-3xl font-black uppercase tracking-tighter">
              Vehicli<span className="text-primary">x</span>
            </span>
          </Link>
          <h1 className="text-4xl font-black uppercase tracking-tight italic">Request Beta Access</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
            Join the premium EV dealership network
          </p>
        </div>

        <Card className="rounded-[2.5rem] border-2 border-primary/5 shadow-xl overflow-hidden">
          <CardHeader className="bg-primary/5 p-10">
            <CardTitle className="text-xl font-black uppercase tracking-tight italic">Dealership Application</CardTitle>
            <CardDescription className="font-medium italic">
              Please provide your dealership details. Our team will review your request within 24-48 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="dealershipName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Dealership Name</Label>
                  <Input id="dealershipName" name="dealershipName" placeholder="Elite Motors Group" required className="h-12 rounded-2xl border-2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contact Name</Label>
                  <Input id="contactName" name="contactName" placeholder="John Doe" required className="h-12 rounded-2xl border-2" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Work Email</Label>
                  <Input id="email" name="email" type="email" placeholder="john@elitemotors.com" required className="h-12 rounded-2xl border-2" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="(555) 000-0000" required className="h-12 rounded-2xl border-2" />
                </div>
              </div>

              {error && (
                <div className="bg-destructive/5 border-2 border-destructive/10 p-4 rounded-2xl flex items-center gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={isPending} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground font-bold italic">
          Already have an account?{" "}
          <Link href={storefrontAuthBridgeHref(pathname || "/request-access")} className="text-primary hover:underline">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}
