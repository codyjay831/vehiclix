"use client";

import * as React from "react";
import { approveBetaRequestAction, rejectBetaRequestAction, regenerateInviteAction } from "@/actions/beta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, X, Loader2, Copy, Send, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function BetaActions({ requestId, organizationId, status }: { requestId: string, organizationId?: string | null, status: string }) {
  const [isPending, setIsPending] = React.useState(false);
  const [inviteToken, setInviteToken] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = React.useState(false);
  const [slugOverride, setSlugOverride] = React.useState("");

  const handleApprove = async () => {
    setIsPending(true);
    try {
      const result = await approveBetaRequestAction(requestId, slugOverride || undefined);
      if (result.success && result.inviteToken) {
        setInviteToken(result.inviteToken);
        setIsApproveDialogOpen(false);
        toast.success("Approved and provisioned!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to approve.");
    } finally {
      setIsPending(false);
    }
  };

  const handleReject = async () => {
    setIsPending(true);
    try {
      await rejectBetaRequestAction(requestId, rejectReason);
      setIsRejectDialogOpen(false);
      toast.success("Request rejected.");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject.");
    } finally {
      setIsPending(false);
    }
  };

  const handleRegenerate = async () => {
    if (!organizationId) return;
    setIsPending(true);
    try {
      const result = await regenerateInviteAction(organizationId);
      if (result.success && result.inviteToken) {
        setInviteToken(result.inviteToken);
        toast.success("Invite regenerated and sent!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate.");
    } finally {
      setIsPending(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteToken) return;
    const url = `${window.location.origin}/setup-owner/${inviteToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Copied!");
  };

  if (inviteToken) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="text-[10px] h-7 font-black uppercase tracking-widest" onClick={copyInviteLink}>
          <Copy className="h-3 w-3 mr-1" /> Copy Link
        </Button>
        <span className="text-[10px] text-muted-foreground italic">Link active for 72h</span>
      </div>
    );
  }

  if (status === "APPROVED" && organizationId) {
    return (
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5" 
        onClick={handleRegenerate}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
        Regenerate Invite
      </Button>
    );
  }

  if (status === "REJECTED" || status === "APPROVED") return null;

  return (
    <div className="flex gap-2">
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            size="sm" 
            className="h-8 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-[10px]"
            disabled={isPending}
          >
            <Check className="h-3 w-3 mr-1" />
            Approve
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight italic">Approve Request</DialogTitle>
            <DialogDescription className="font-medium italic">This will provision the organization and generate an owner invite.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Custom Slug (Optional)</Label>
              <Input 
                value={slugOverride} 
                onChange={(e) => setSlugOverride(e.target.value)} 
                placeholder="e.g. custom-dealership-name"
                className="h-12 rounded-2xl border-2"
              />
              <p className="text-[10px] text-muted-foreground italic">Leave blank to auto-generate from dealership name.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-full bg-green-600 hover:bg-green-700 font-black uppercase tracking-widest" onClick={handleApprove} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            size="sm" 
            variant="destructive" 
            className="h-8 font-black uppercase tracking-widest text-[10px]"
            disabled={isPending}
          >
            <X className="h-3 w-3 mr-1" />
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-black uppercase tracking-tight italic">Reject Request</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Rejection Reason</Label>
              <Input 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="e.g. Incomplete information" 
                className="h-12 rounded-2xl border-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="rounded-full font-black uppercase tracking-widest" onClick={handleReject} disabled={!rejectReason || isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
