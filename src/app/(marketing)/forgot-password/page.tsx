"use client";

import * as React from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/actions/password";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CarFront, Loader2, ArrowLeft } from "lucide-react";
import { BRANDING } from "@/config/branding";

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    await requestPasswordResetAction(formData);

    setDone(true);
    setIsPending(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="flex flex-col items-center gap-4">
          <Link href="/" className="group flex items-center gap-2">
            <div className="bg-primary/5 p-2 rounded-xl group-hover:bg-primary/10 transition-colors">
              <CarFront className="h-8 w-8 text-primary" />
            </div>
            <span className="text-3xl font-black uppercase tracking-tighter italic">
              {BRANDING.companyName.split(" ")[0]}
              <span className="text-primary">{BRANDING.companyName.split(" ")[1]}</span>
            </span>
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-black uppercase tracking-tight italic">Forgot password</h1>
            <p className="text-sm text-muted-foreground font-medium italic mt-1">
              Enter your email and we&apos;ll send reset instructions if an account exists.
            </p>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] overflow-hidden border-primary/5">
          <CardHeader className="bg-primary/5 pb-8 pt-10 px-10 text-center">
            <CardTitle className="text-xl font-black uppercase tracking-tight italic">Reset link</CardTitle>
          </CardHeader>
          <CardContent className="p-10">
            {done ? (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground text-center font-medium leading-relaxed">
                  If an account exists, you&apos;ll receive an email.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-full h-12 font-black uppercase tracking-widest text-xs"
                  onClick={() => setDone(false)}
                >
                  Send another email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >
                    Email address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    autoComplete="email"
                    className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-full h-14 font-black uppercase tracking-widest shadow-xl bg-[#1A1A1A] hover:bg-[#2A2A2A] disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send reset link"}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="bg-muted/30 border-t-2 border-primary/5 p-8 flex flex-col gap-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
