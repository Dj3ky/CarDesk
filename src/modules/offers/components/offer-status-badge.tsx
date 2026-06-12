"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { OfferStatus } from "../types";

const STATUS_CLASS: Record<OfferStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  COMPLETED: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

interface OfferStatusBadgeProps {
  status: OfferStatus;
  className?: string;
}

export function OfferStatusBadge({ status, className }: OfferStatusBadgeProps) {
  const t = useTranslations("offers.statuses");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASS[status] ?? STATUS_CLASS.DRAFT,
        className
      )}
    >
      {t(status)}
    </span>
  );
}
