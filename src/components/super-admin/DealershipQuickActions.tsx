"use client";

import * as React from "react";
import { startSupportSession } from "@/actions/support";
import { suspendOrganizationAction, reactivateOrganizationAction } from "@/actions/super-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  Copy,
  Store,
  ShieldOff,
  ShieldCheck,
  CreditCard,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type OrganizationStatus = "ACTIVE" | "SUSPENDED";

interface DealershipQuickActionsProps {
  organizationId: string;
  slug: string;
  status: OrganizationStatus;
}

export function DealershipQuickActions({
  organizationId,
  slug,
  status,
}: DealershipQuickActionsProps) {
  const [isPreviewPending, setIsPreviewPending] = React.useState(false);
  const [isSuspendPending, setIsSuspendPending] = React.useState(false);
  const [isReactivatePending, setIsReactivatePending] = React.useState(false);
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [reactivateOpen, setReactivateOpen] = React.useState(false);

  const storefrontUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${slug}`
      : `/${slug}`;

  const handleCopyLink = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/${slug}`
        : `${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Dealership link copied to clipboard");
  };

  const handlePreviewAsDealer = async () => {
    setIsPreviewPending(true);
    try {
      await startSupportSession(organizationId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start preview");
      setIsPreviewPending(false);
    }
  };

  const handleSuspend = async () => {
    setIsSuspendPending(true);
    try {
      await suspendOrganizationAction(organizationId);
      toast.success("Dealership suspended");
      setSuspendOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to suspend");
    } finally {
      setIsSuspendPending(false);
    }
  };

  const handleReactivate = async () => {
    setIsReactivatePending(true);
    try {
      await reactivateOrganizationAction(organizationId);
      toast.success("Dealership reactivated");
      setReactivateOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reactivate");
    } finally {
      setIsReactivatePending(false);
    }
  };

  return (
    <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="bg-muted/30 border-b p-6">
        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-3">
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start h-10 rounded-xl text-xs font-bold uppercase tracking-widest text-amber-600 border-amber-500/20 hover:bg-amber-50 hover:border-amber-500/40 transition-all"
          disabled={isPreviewPending}
          onClick={handlePreviewAsDealer}
        >
          {isPreviewPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-2" />
          )}
          Preview as Dealer (Support Mode)
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start h-10 rounded-xl text-xs font-bold uppercase tracking-widest"
          onClick={handleCopyLink}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy dealership link
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start h-10 rounded-xl text-xs font-bold uppercase tracking-widest"
          asChild
        >
          <a
            href={storefrontUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center"
          >
            <Store className="h-4 w-4 mr-2" />
            View public storefront
          </a>
        </Button>
        {status === "ACTIVE" ? (
          <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start h-10 rounded-xl text-xs font-bold uppercase tracking-widest text-destructive/90 border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30"
              >
                <ShieldOff className="h-4 w-4 mr-2" />
                Suspend dealership
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Suspend this dealership?</DialogTitle>
                <DialogDescription>
                  Owners will lose access to admin. The public storefront will show a &quot;Temporarily unavailable&quot; message. You can reactivate at any time.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSuspendOpen(false)} disabled={isSuspendPending}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleSuspend} disabled={isSuspendPending}>
                  {isSuspendPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {isSuspendPending ? "Suspending…" : "Suspend"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog open={reactivateOpen} onOpenChange={setReactivateOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start h-10 rounded-xl text-xs font-bold uppercase tracking-widest text-green-700 border-green-600/20 hover:bg-green-50 hover:border-green-600/40"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Reactivate dealership
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reactivate this dealership?</DialogTitle>
                <DialogDescription>
                  Owners will regain admin access and the public storefront will be visible again.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReactivateOpen(false)} disabled={isReactivatePending}>
                  Cancel
                </Button>
                <Button onClick={handleReactivate} disabled={isReactivatePending}>
                  {isReactivatePending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {isReactivatePending ? "Reactivating…" : "Reactivate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start h-10 rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60 cursor-not-allowed"
          disabled
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Change plan (coming soon)
        </Button>
      </CardContent>
    </Card>
  );
}
