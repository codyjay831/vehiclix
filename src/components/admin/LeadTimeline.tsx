"use client";

import { LeadActivity, LeadActivityType, User } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { 
  MessageSquare, 
  ArrowRightLeft, 
  LogIn, 
  UserPlus, 
  Settings,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineActivity extends LeadActivity {
  actorUser: { firstName: string; lastName: string } | null;
}

interface LeadTimelineProps {
  activities: TimelineActivity[];
}

const TYPE_ICONS: Record<LeadActivityType, any> = {
  NOTE: MessageSquare,
  STAGE_CHANGE: ArrowRightLeft,
  INBOUND: LogIn,
  ASSIGNMENT: UserPlus,
  SYSTEM: Settings,
};

const TYPE_COLORS: Record<LeadActivityType, string> = {
  NOTE: "text-blue-500 bg-blue-500/10",
  STAGE_CHANGE: "text-purple-500 bg-purple-500/10",
  INBOUND: "text-green-500 bg-green-500/10",
  ASSIGNMENT: "text-orange-500 bg-orange-500/10",
  SYSTEM: "text-slate-500 bg-slate-500/10",
};

export function LeadTimeline({ activities }: LeadTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="py-12 text-center border-2 border-dashed rounded-xl">
        <p className="text-muted-foreground text-sm italic">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:left-5 before:w-px before:bg-border">
      {activities.map((activity, index) => {
        const Icon = TYPE_ICONS[activity.type] || Circle;
        
        return (
          <div key={activity.id} className="relative pl-12">
            {/* Icon Dot */}
            <div className={cn(
              "absolute left-0 top-0 h-10 w-10 rounded-full border-4 border-background flex items-center justify-center z-10",
              TYPE_COLORS[activity.type]
            )}>
              <Icon className="h-4 w-4" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-foreground">
                  {activity.type.replace("_", " ")}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </span>
              </div>
              
              {activity.body && (
                <div className="bg-muted/30 p-4 rounded-xl text-sm leading-relaxed border border-border/50">
                  {activity.body}
                </div>
              )}

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                {activity.actorUser ? (
                  <span>By {activity.actorUser.firstName} {activity.actorUser.lastName}</span>
                ) : (
                  <span>System Auto</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
