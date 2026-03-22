"use client";

import * as React from "react";
import { claimOwnerAccountAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MIN_PASSWORD_LENGTH, PASSWORD_MIN_ERROR } from "@/lib/auth/password";

export default function SetupOwnerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("token", token);
    const result = await claimOwnerAccountAction(formData);

    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 group">
            <div className="bg-primary p-2 rounded-xl">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-3xl font-black uppercase tracking-tighter">
              Vehicli<span className="text-primary">x</span>
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight italic">Claim Your Dealership</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Verify your identity and set your password</p>
        </div>

        <Card className="rounded-[2.5rem] border-2 border-primary/5 shadow-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 p-10 text-center">
            <CardTitle className="text-xl font-black uppercase tracking-tight italic">Owner Setup</CardTitle>
            <CardDescription className="font-medium italic">Finalize your account to access the admin dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">First Name</Label>
                  <Input id="firstName" name="firstName" placeholder="John" required className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Last Name</Label>
                  <Input id="lastName" name="lastName" placeholder="Doe" required className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</Label>
                <Input id="phone" name="phone" type="tel" placeholder="(555) 000-0000" className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Set Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
                />
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-1">{PASSWORD_MIN_ERROR}</p>
              </div>

              {error && (
                <div className="bg-destructive/5 border-2 border-destructive/10 p-4 rounded-2xl flex items-center gap-3 text-destructive">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={isPending} className="w-full h-14 rounded-full font-black uppercase tracking-widest shadow-xl group bg-primary hover:opacity-90">
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    Complete Setup
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
