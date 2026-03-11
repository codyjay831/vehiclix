import * as React from "react";
import { DealStatus } from "@prisma/client";
import { DEAL_STATUS_LABELS } from "@/types";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface MilestoneTrackerProps {
  status: DealStatus;
}

const MILESTONE_MAP: Record<DealStatus, number> = {
  [DealStatus.LEAD]: 0,
  [DealStatus.DEPOSIT_PENDING]: 0,
  [DealStatus.DEPOSIT_RECEIVED]: 1,
  [DealStatus.DOCUMENTS_PENDING]: 2,
  [DealStatus.CONTRACTS_SENT]: 3,
  [DealStatus.CONTRACTS_SIGNED]: 3,
  [DealStatus.FINANCING_PENDING]: 4,
  [DealStatus.READY_FOR_DELIVERY]: 4,
  [DealStatus.COMPLETED]: 4,
  [DealStatus.CANCELLED]: 0,
};

const MILESTONES = [
  { label: "Reserve", id: 1 },
  { label: "Documents", id: 2 },
  { label: "Contract", id: 3 },
  { label: "Delivery", id: 4 },
];

export function MilestoneTracker({ status }: MilestoneTrackerProps) {
  const currentStep = MILESTONE_MAP[status];
  const friendlyLabel = DEAL_STATUS_LABELS[status];

  return (
    <div className="space-y-6">
      {/* Visual Status Heading */}
      <div className="flex items-center gap-3 border-b-2 border-primary/5 pb-4">
        <div className="bg-primary/10 p-2 rounded-lg text-primary">
          <Clock className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-none">
            Current Status
          </p>
          <p className="text-2xl font-black uppercase tracking-tight italic text-primary leading-none">
            {friendlyLabel}
          </p>
        </div>
      </div>

      {/* Progress Tracker Grid */}
      <div className="grid grid-cols-4 gap-4">
        {MILESTONES.map((milestone) => {
          const isCompleted = milestone.id < currentStep;
          const isActive = milestone.id === currentStep;

          return (
            <div key={milestone.label} className="relative space-y-3">
              <div
                className={`h-2.5 rounded-full transition-all duration-700 ease-in-out ${
                  isCompleted
                    ? "bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                    : isActive
                    ? "bg-primary animate-pulse"
                    : "bg-muted/40"
                }`}
              />
              <div className="flex items-center gap-1.5 overflow-hidden">
                {isCompleted ? (
                  <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                ) : isActive ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 animate-bounce" />
                ) : (
                  <Circle className="h-3 w-3 text-muted-foreground/30 flex-shrink-0" />
                )}
                <span
                  className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                    isActive ? "text-primary" : "text-muted-foreground/60"
                  }`}
                >
                  {milestone.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
