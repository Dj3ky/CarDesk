"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateOfferStatus } from "../actions/update-offer-status";
import type { OfferStatus } from "../types";

interface StatusAction {
  label: string;
  to: OfferStatus;
  variant: "default" | "outline" | "destructive" | "secondary";
}

const ACTIONS_BY_STATUS: Record<OfferStatus, StatusAction[]> = {
  DRAFT: [{ label: "Mark as Sent", to: "SENT", variant: "default" }],
  SENT: [
    { label: "Approve", to: "APPROVED", variant: "default" },
    { label: "Reject", to: "REJECTED", variant: "destructive" },
    { label: "Revert to Draft", to: "DRAFT", variant: "outline" },
  ],
  APPROVED: [
    { label: "Mark as Completed", to: "COMPLETED", variant: "default" },
    { label: "Revert to Draft", to: "DRAFT", variant: "outline" },
  ],
  REJECTED: [{ label: "Reopen as Draft", to: "DRAFT", variant: "outline" }],
  COMPLETED: [],
};

interface StatusActionsProps {
  offerId: string;
  status: OfferStatus;
}

export function StatusActions({ offerId, status }: StatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const actions = ACTIONS_BY_STATUS[status] ?? [];

  if (actions.length === 0) return null;

  function handleAction(to: OfferStatus) {
    startTransition(async () => {
      await updateOfferStatus(offerId, to);
      router.refresh();
    });
  }

  return (
    <>
      {actions.map((action) => (
        <Button
          key={action.to}
          variant={action.variant}
          size="sm"
          disabled={isPending}
          onClick={() => handleAction(action.to)}
        >
          {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {action.label}
        </Button>
      ))}
    </>
  );
}
