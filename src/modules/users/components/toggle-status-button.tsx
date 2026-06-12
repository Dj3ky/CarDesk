"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toggleUserStatus } from "../actions/toggle-user-status";

interface ToggleStatusButtonProps {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
}

export function ToggleStatusButton({ userId, isActive, isSelf }: ToggleStatusButtonProps) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (isSelf && isActive) return;
    startTransition(async () => {
      await toggleUserStatus(userId, !isActive);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending || (isSelf && isActive)}
      className="disabled:cursor-not-allowed"
      title={isSelf && isActive ? t("selfDeactivateError") : undefined}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={isActive && !isSelf ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
        >
          {isActive ? tc("active") : tc("inactive")}
        </Badge>
      )}
    </button>
  );
}
