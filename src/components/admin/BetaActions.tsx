"use client";

import * as React from "react";
import { approveBetaRequestAction, rejectBetaRequestAction } from "@/actions/beta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, Loader2, Copy } from "lucide-react";
import { toast } from "sonner"; // Assuming sonner is used for toasts, if not, adjust.

export function BetaActions({ requestId }: { requestId: string }) {
  const [isPending, setIsPending] = React.useState(false);
  const [inviteToken, setInviteToken] = React.useState<string | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);

  const handleApprove = async () => {
    setIsPending(true);
    try {
      const result = await approveBetaRequestAction(requestId);
      if (result.success && result.inviteToken) {
        setInviteToken(result.inviteToken);
        toast.success("Request approved and organization provisioned!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to approve request.");
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
      toast.error(err.message || "Failed to reject request.");
    } finally {
      setIsPending(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteToken) return;
    const url = `${window.location.origin}/setup-owner/${inviteToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied to clipboard!");
  };

  if (inviteToken) {
    return (
      <div className="flex flex-col gap-2">
        <Button size="sm" variant="outline" className="text-xs h-8" onClick={copyInviteLink}>
          <Copy className="h-3 w-3 mr-2" /> Copy Invite Link
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        className="h-8 bg-green-600 hover:bg-green-700 text-white" 
        onClick={handleApprove}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
        Approve
      </Button>
      
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            size="sm" 
            variant="destructive" 
            className="h-8"
            disabled={isPending}
          >
            <X className="h-3 w-3 mr-1" />
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Rejection Reason</label>
              <Input 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)} 
                placeholder="e.g. Incomplete information, outside of beta region" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason || isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
