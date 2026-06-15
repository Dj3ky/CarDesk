import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OfferStatus } from "../types";

const STATUS_ORDER: OfferStatus[] = ["DRAFT", "SENT", "APPROVED", "COMPLETED"];

interface OfferStatusTimelineProps {
  status: OfferStatus;
  labels: Record<OfferStatus, string>;
}

export function OfferStatusTimeline({ status, labels }: OfferStatusTimelineProps) {
  const isRejected = status === "REJECTED";
  const currentIndex = isRejected ? 2 : STATUS_ORDER.indexOf(status);

  const steps = STATUS_ORDER.map((s, i) => {
    const displayStatus: OfferStatus = i === 2 && isRejected ? "REJECTED" : s;
    const label = labels[displayStatus];

    type StepState = "done" | "active" | "upcoming" | "rejected";
    let state: StepState;
    if (i === 2 && isRejected) state = "rejected";
    else if (i < currentIndex) state = "done";
    else if (i === currentIndex) state = "active";
    else state = "upcoming";

    return { label, state };
  });

  return (
    <div className="flex items-start">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                step.state === "done" &&
                  "border-primary bg-primary text-primary-foreground",
                step.state === "active" &&
                  "border-primary bg-primary/10 text-primary",
                step.state === "upcoming" &&
                  "border-border bg-background text-muted-foreground/40",
                step.state === "rejected" &&
                  "border-destructive bg-destructive text-destructive-foreground",
              )}
            >
              {step.state === "done" && <Check className="h-4 w-4" />}
              {step.state === "rejected" && <X className="h-4 w-4" />}
              {(step.state === "active" || step.state === "upcoming") && (
                <span>{i + 1}</span>
              )}
            </div>
            <span
              className={cn(
                "text-xs whitespace-nowrap px-1 text-center",
                step.state === "done" && "font-medium text-foreground",
                step.state === "active" && "font-semibold text-primary",
                step.state === "upcoming" && "text-muted-foreground/40",
                step.state === "rejected" && "font-medium text-destructive",
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-0.5 flex-1 mx-2 mb-5 rounded-full transition-colors",
                i < currentIndex ? "bg-primary" : "bg-border",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
