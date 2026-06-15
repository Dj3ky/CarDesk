"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateWorkOrderStatus } from "../actions/update-work-order-status";
import type { WorkOrderStatus } from "../types";

type ActionDef = { label: string; to: WorkOrderStatus; variant: "default" | "destructive" | "outline" | "secondary" };

const ACTIONS_BY_STATUS: Record<WorkOrderStatus, ActionDef[]> = {
  OPEN:          [{ label: "Start Work",        to: "IN_PROGRESS",   variant: "default"      }, { label: "Cancel", to: "CANCELLED", variant: "destructive" }],
  IN_PROGRESS:   [{ label: "Wait for Parts",    to: "WAITING_PARTS", variant: "outline"      }, { label: "Mark Done", to: "DONE", variant: "default" }, { label: "Cancel", to: "CANCELLED", variant: "destructive" }],
  WAITING_PARTS: [{ label: "Resume Work",       to: "IN_PROGRESS",   variant: "default"      }, { label: "Cancel", to: "CANCELLED", variant: "destructive" }],
  DONE:          [{ label: "Mark as Invoiced",  to: "INVOICED",      variant: "default"      }, { label: "Reopen", to: "IN_PROGRESS", variant: "outline" }],
  INVOICED:      [],
  CANCELLED:     [{ label: "Reopen",            to: "OPEN",          variant: "outline"      }],
};

interface StatusActionsProps {
  workOrderId: string;
  status: WorkOrderStatus;
}

export function StatusActions({ workOrderId, status }: StatusActionsProps) {
  const [isPending, startTransition] = useTransition();
  const actions = ACTIONS_BY_STATUS[status] ?? [];

  if (actions.length === 0) return null;

  function handleAction(to: WorkOrderStatus) {
    startTransition(async () => {
      const result = await updateWorkOrderStatus(workOrderId, to);
      if (result.success) {
        toast.success("Status updated");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.to}
          variant={action.variant}
          size="sm"
          disabled={isPending}
          onClick={() => handleAction(action.to)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
