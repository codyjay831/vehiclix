"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addLeadNoteAction } from "@/actions/crm";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface LeadNoteComposerProps {
  leadId: string;
}

export function LeadNoteComposer({ leadId }: LeadNoteComposerProps) {
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await addLeadNoteAction(leadId, note.trim());
      if (result.success) {
        setNote("");
        toast.success("Note added successfully");
      }
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Send className="h-3 w-3" />
          Quick Note
        </h3>
        <Textarea
          placeholder="Add a private note about this lead..."
          className="min-h-[100px] rounded-2xl resize-none bg-muted/20 border-border/50 focus:bg-background transition-all"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting || !note.trim()} 
          className="font-black uppercase tracking-widest text-xs h-10 px-6 rounded-full"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Add Note"
          )}
        </Button>
      </div>
    </form>
  );
}
