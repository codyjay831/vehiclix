"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CarFront, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

import { BRANDING } from "@/config/branding";
import { effectivePostLoginReturnPath } from "@/lib/api/auth-bridge-utils";

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
      </div>
    }>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  /** Only safe same-origin paths are echoed into the form; server sanitizes again. */
  const from = effectivePostLoginReturnPath(searchParams.get("from")) ?? "";
  const passwordResetOk = searchParams.get("passwordReset") === "success";
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="group flex items-center gap-2">
            <div className="bg-primary/5 p-2 rounded-xl group-hover:bg-primary/10 transition-colors">
              <CarFront className="h-8 w-8 text-primary" />
            </div>
            <span className="text-3xl font-black uppercase tracking-tighter italic">
              {BRANDING.companyName.split(' ')[0]}<span className="text-primary">{BRANDING.companyName.split(' ')[1]}</span>
            </span>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-black uppercase tracking-tight italic">Welcome Back</h1>
            <p className="text-sm text-muted-foreground font-medium italic mt-1">Sign in to access your portal</p>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] overflow-hidden border-primary/5">
          <CardHeader className="bg-primary/5 pb-8 pt-10 px-10 text-center">
            <CardTitle className="text-xl font-black uppercase tracking-tight italic">Account Login</CardTitle>
          </CardHeader>
          <CardContent className="p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <input type="hidden" name="from" value={from} />
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
                />
              </div>
              {passwordResetOk && (
                <div className="bg-primary/5 border-2 border-primary/10 p-4 rounded-2xl flex items-center gap-3 text-primary animate-in fade-in duration-500">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <p className="text-xs font-black uppercase tracking-tight leading-snug">
                    Your password was reset. Sign in with your new password.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
                />
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
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t-2 border-primary/5 p-8 flex flex-col gap-4 text-center">
            <p className="text-xs font-bold text-muted-foreground italic">
              Please register through your dealership&apos;s showroom page.
            </p>
            <div className="h-px w-10 bg-border mx-auto" />
            <Link href="/request-access" className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">
              Are you a dealership? Request Beta Access
            </Link>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
