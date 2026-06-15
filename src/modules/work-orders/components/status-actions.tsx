"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateWorkOrderStatus } from "../actions/update-work-order-status";
import type { WorkOrderStatus } from "../types";

type ActionKey = "startWork" | "waitForParts" | "markDone" | "resumeWork" | "markAsInvoiced" | "reopen" | "cancel";
type ActionDef = { key: ActionKey; to: WorkOrderStatus; variant: "default" | "destructive" | "outline" | "secondary" };

const ACTIONS_BY_STATUS: Record<WorkOrderStatus, ActionDef[]> = {
  OPEN:          [{ key: "startWork",       to: "IN_PROGRESS",   variant: "default"      }, { key: "cancel", to: "CANCELLED", variant: "destructive" }],
  IN_PROGRESS:   [{ key: "waitForParts",    to: "WAITING_PARTS", variant: "outline"      }, { key: "markDone", to: "DONE", variant: "default" }, { key: "cancel", to: "CANCELLED", variant: "destructive" }],
  WAITING_PARTS: [{ key: "resumeWork",      to: "IN_PROGRESS",   variant: "default"      }, { key: "cancel", to: "CANCELLED", variant: "destructive" }],
  DONE:          [{ key: "markAsInvoiced",  to: "INVOICED",      variant: "default"      }, { key: "reopen", to: "IN_PROGRESS", variant: "outline" }],
  INVOICED:      [],
  CANCELLED:     [{ key: "reopen",          to: "OPEN",          variant: "outline"      }],
};

interface StatusActionsProps {
  workOrderId: string;
  status: WorkOrderStatus;
}

export function StatusActions({ workOrderId, status }: StatusActionsProps) {
  const t = useTranslations("workOrders");
  const [isPending, startTransition] = useTransition();
  const actions = ACTIONS_BY_STATUS[status] ?? [];

  if (actions.length === 0) return null;

  function handleAction(to: WorkOrderStatus) {
    startTransition(async () => {
      const result = await updateWorkOrderStatus(workOrderId, to);
      if (result.success) {
        toast.success(t("statusUpdated"));
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
          {t(`actions.${action.key}`)}
        </Button>
      ))}
    </div>
  );
}
