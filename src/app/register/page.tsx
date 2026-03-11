"use client";

import * as React from "react";
import Link from "next/link";
import { registerAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CarFront, ArrowRight, AlertCircle, Loader2, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await registerAction(formData);

    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6 py-12">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="group flex items-center gap-2">
            <div className="bg-primary/5 p-2 rounded-xl group-hover:bg-primary/10 transition-colors">
              <CarFront className="h-8 w-8 text-primary" />
            </div>
            <span className="text-3xl font-black uppercase tracking-tighter italic">
              Evo<span className="text-primary">Motors</span>
            </span>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-black uppercase tracking-tight italic">Create Account</h1>
            <p className="text-sm text-muted-foreground font-medium italic mt-1">Start your journey with premium electric mobility</p>
          </div>
        </div>

        <Card className="rounded-[3rem] border-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] overflow-hidden border-primary/5">
          <CardHeader className="bg-primary/5 pb-8 pt-10 px-10 text-center">
            <div className="bg-white p-3 rounded-2xl w-fit mx-auto shadow-sm ring-1 ring-primary/5 mb-4 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-black uppercase tracking-tight italic leading-none">Customer Registration</CardTitle>
          </CardHeader>
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="John"
                    required
                    className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="Doe"
                    required
                    className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
                />
                <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-1">Minimum 8 characters required</p>
              </div>

              {error && (
                <div className="bg-destructive/5 border-2 border-destructive/10 p-4 rounded-2xl flex items-center gap-3 text-destructive animate-in shake duration-500">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight leading-none">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full h-14 font-black uppercase tracking-widest shadow-xl group bg-[#1A1A1A] hover:bg-[#2A2A2A] disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t-2 border-primary/5 p-8 justify-center">
            <p className="text-xs font-bold text-muted-foreground italic">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline underline-offset-4 font-black uppercase tracking-widest ml-1">
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>

        <div className="text-center px-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 leading-relaxed italic">
            By creating an account, you agree to our terms of service and privacy policy. Your data is securely encrypted.
          </p>
        </div>
      </div>
    </div>
  );
}
