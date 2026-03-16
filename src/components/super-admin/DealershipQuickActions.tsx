"use client";

import * as React from "react";
import { startSupportSession } from "@/actions/support";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ExternalLink,
  Copy,
  Store,
  ShieldOff,
  CreditCard,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface DealershipQuickActionsProps {
  organizationId: string;
  slug: string;
}

export function DealershipQuickActions({
  organizationId,
  slug,
}: DealershipQuickActionsProps) {
  const [isPreviewPending, setIsPreviewPending] = React.useState(false);

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
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-start h-10 rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-60 cursor-not-allowed"
          disabled
        >
          <ShieldOff className="h-4 w-4 mr-2" />
          Suspend / Reactivate (coming soon)
        </Button>
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
