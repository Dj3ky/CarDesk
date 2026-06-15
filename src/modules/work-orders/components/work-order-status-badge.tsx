"use client";

import { cn } from "@/lib/utils";
import type { WorkOrderStatus } from "../types";

const STATUS_CLASS: Record<WorkOrderStatus, string> = {
  OPEN:          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  IN_PROGRESS:   "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  WAITING_PARTS: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  DONE:          "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  INVOICED:      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  CANCELLED:     "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  OPEN:          "Open",
  IN_PROGRESS:   "In Progress",
  WAITING_PARTS: "Waiting Parts",
  DONE:          "Done",
  INVOICED:      "Invoiced",
  CANCELLED:     "Cancelled",
};

interface WorkOrderStatusBadgeProps {
  status: WorkOrderStatus;
  className?: string;
}

export function WorkOrderStatusBadge({ status, className }: WorkOrderStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASS[status] ?? STATUS_CLASS.OPEN,
        className
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
