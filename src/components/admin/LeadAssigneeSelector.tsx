"use client";

import { useState, useTransition } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { assignLeadAction } from "@/actions/crm";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";

interface LeadAssigneeSelectorProps {
  leadId: string;
  currentAssigneeId: string | null;
  assignableUsers: { id: string; firstName: string; lastName: string }[];
}

export function LeadAssigneeSelector({ leadId, currentAssigneeId, assignableUsers }: LeadAssigneeSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [assigneeId, setAssigneeId] = useState<string>(currentAssigneeId || "unassigned");

  const handleAssigneeChange = (val: string) => {
    const finalId = val === "unassigned" ? null : val;
    setAssigneeId(val);
    startTransition(async () => {
      try {
        const result = await assignLeadAction(leadId, finalId);
        if (result.success) {
          toast.success(finalId ? "Lead assigned" : "Lead unassigned");
        }
      } catch (error) {
        setAssigneeId(currentAssigneeId || "unassigned");
        toast.error("Failed to assign lead");
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground italic flex items-center gap-1">
          <UserPlus className="h-3 w-3" />
          Assignee
        </label>
        {isPending && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
      </div>
      <Select value={assigneeId} onValueChange={handleAssigneeChange} disabled={isPending}>
        <SelectTrigger className="h-11 rounded-xl font-bold text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned" className="text-xs font-medium text-muted-foreground">Unassigned</SelectItem>
          {assignableUsers.map((u) => (
            <SelectItem 
              key={u.id} 
              value={u.id}
              className="text-xs font-bold"
            >
              {u.firstName} {u.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
