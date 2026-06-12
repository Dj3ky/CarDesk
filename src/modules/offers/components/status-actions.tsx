"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateOfferStatus } from "../actions/update-offer-status";
import type { OfferStatus } from "../types";

type ActionDef = {
  key: string;
  to: OfferStatus;
  variant: "default" | "outline" | "destructive" | "secondary";
};

const ACTIONS_BY_STATUS: Record<OfferStatus, ActionDef[]> = {
  DRAFT: [{ key: "markAsSent", to: "SENT", variant: "default" }],
  SENT: [
    { key: "approve", to: "APPROVED", variant: "default" },
    { key: "reject", to: "REJECTED", variant: "destructive" },
    { key: "revertToDraft", to: "DRAFT", variant: "outline" },
  ],
  APPROVED: [
    { key: "complete", to: "COMPLETED", variant: "default" },
    { key: "revertToDraft", to: "DRAFT", variant: "outline" },
  ],
  REJECTED: [{ key: "revertToDraft", to: "DRAFT", variant: "outline" }],
  COMPLETED: [],
};

interface StatusActionsProps {
  offerId: string;
  status: OfferStatus;
}

export function StatusActions({ offerId, status }: StatusActionsProps) {
  const t = useTranslations("offers.actions");
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
          {t(action.key)}
        </Button>
      ))}
    </>
  );
}
