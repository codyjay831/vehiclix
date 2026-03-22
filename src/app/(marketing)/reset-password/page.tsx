"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { completePasswordResetAction } from "@/actions/password";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CarFront, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { BRANDING } from "@/config/branding";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6">
          <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
        </div>
      }
    >
      <ResetPasswordForm />
    </React.Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await completePasswordResetAction(formData);

    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
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
            <h1 className="text-2xl font-black uppercase tracking-tight italic">New password</h1>
            <p className="text-sm text-muted-foreground font-medium italic mt-1">
              Choose a new password for your account.
            </p>
          </div>
        </div>

        <Card className="rounded-[2.5rem] border-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] overflow-hidden border-primary/5">
          <CardHeader className="bg-primary/5 pb-8 pt-10 px-10 text-center">
            <CardTitle className="text-xl font-black uppercase tracking-tight italic">Reset password</CardTitle>
          </CardHeader>
          <CardContent className="p-10">
            {!token ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  This link is missing a reset token. Request a new email to get a valid link.
                </p>
                <Button asChild className="rounded-full font-black uppercase tracking-widest text-xs h-11">
                  <Link href="/forgot-password">Request reset email</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <input type="hidden" name="token" value={token} />
                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >
                    New password
                  </Label>
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
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
                  >
                    Confirm password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    autoComplete="new-password"
                    className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
                  />
                </div>

                {error && (
                  <div className="space-y-4">
                    <div className="bg-destructive/5 border-2 border-destructive/10 p-4 rounded-2xl flex items-center gap-3 text-destructive animate-in shake duration-500">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <p className="text-xs font-black uppercase tracking-tight leading-snug">{error}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground text-center font-medium leading-relaxed">
                      If this link expired or was already used, request a new reset email.
                    </p>
                    <div className="flex justify-center">
                      <Button asChild variant="outline" className="rounded-full font-black uppercase tracking-widest text-[10px] h-10">
                        <Link href="/forgot-password">Request reset email</Link>
                      </Button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-full h-14 font-black uppercase tracking-widest shadow-xl bg-[#1A1A1A] hover:bg-[#2A2A2A] disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update password"}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="bg-muted/30 border-t-2 border-primary/5 p-8 flex flex-col gap-4 text-center">
            <Link
              href="/forgot-password"
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
            >
              Request a new link
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
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
