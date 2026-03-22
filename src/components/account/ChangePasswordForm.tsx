"use client";

import * as React from "react";
import { changePasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { MIN_PASSWORD_LENGTH, PASSWORD_MIN_ERROR } from "@/lib/auth/password";

export function ChangePasswordForm() {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await changePasswordAction(formData);

    if ("error" in result) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    setSuccess(true);
    setIsPending(false);
    e.currentTarget.reset();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="currentPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Current password
        </Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          New password
        </Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder="••••••••"
          className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
        />
        <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest ml-1">{PASSWORD_MIN_ERROR}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
          Confirm new password
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder="••••••••"
          className="h-12 rounded-2xl border-2 focus-visible:ring-primary/20"
        />
      </div>

      {error && (
        <div className="bg-destructive/5 border-2 border-destructive/10 p-4 rounded-2xl flex items-center gap-3 text-destructive">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-xs font-black uppercase tracking-tight leading-snug">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-primary/5 border-2 border-primary/10 p-4 rounded-2xl flex items-center gap-3 text-primary">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <p className="text-xs font-black uppercase tracking-tight leading-snug">Your password was updated.</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="rounded-full h-12 font-black uppercase tracking-widest bg-[#1A1A1A] hover:bg-[#2A2A2A] disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Update password"}
      </Button>
    </form>
  );
}
