"use client";

import { useState, useTransition } from "react";
import { LeadStatus } from "@prisma/client";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { updateLeadStatusAction } from "@/actions/crm";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadStatusSelectorProps {
  leadId: string;
  currentStatus: LeadStatus;
}

const STAGE_COLORS: Record<LeadStatus, string> = {
  NEW: "text-blue-600",
  CONTACTED: "text-purple-600",
  APPOINTMENT: "text-orange-600",
  NEGOTIATING: "text-yellow-600",
  WON: "text-green-600",
  LOST: "text-slate-600",
};

export function LeadStatusSelector({ leadId, currentStatus }: LeadStatusSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<LeadStatus>(currentStatus);

  const handleStatusChange = (newStatus: LeadStatus | null) => {
    if (!newStatus) return;
    setStatus(newStatus);
    startTransition(async () => {
      try {
        const result = await updateLeadStatusAction(leadId, newStatus);
        if (result.success) {
          toast.success(`Lead moved to ${newStatus}`);
        }
      } catch (error) {
        setStatus(currentStatus);
        toast.error("Failed to update status");
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
          Pipeline Stage
        </label>
        {isPending && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
      </div>
      <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
        <SelectTrigger className={cn("h-11 rounded-xl font-bold uppercase tracking-widest text-xs italic", STAGE_COLORS[status])}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(LeadStatus).map((s) => (
            <SelectItem 
              key={s} 
              value={s}
              className={cn("font-bold uppercase tracking-widest text-[10px] italic", STAGE_COLORS[s])}
            >
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
