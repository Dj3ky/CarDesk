"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Copy,
  FileDown,
  FileSpreadsheet,
  Loader2,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { updateOfferStatus } from "../actions/update-offer-status";
import { deleteOffer } from "../actions/delete-offer";
import { duplicateOffer } from "../actions/duplicate-offer";
import type { OfferStatus } from "../types";

/** The "next step" for each status, shown as the main button. */
const PRIMARY_ACTION: Partial<Record<OfferStatus, { key: string; to: OfferStatus }>> = {
  DRAFT: { key: "markAsSent", to: "SENT" },
  SENT: { key: "approve", to: "APPROVED" },
  APPROVED: { key: "complete", to: "COMPLETED" },
};

/** Less common / destructive transitions — in the menu and always confirmed. */
const SECONDARY_ACTIONS: Record<OfferStatus, { key: string; to: OfferStatus }[]> = {
  DRAFT: [],
  SENT: [
    { key: "reject", to: "REJECTED" },
    { key: "revertToDraft", to: "DRAFT" },
  ],
  APPROVED: [{ key: "revertToDraft", to: "DRAFT" }],
  REJECTED: [{ key: "revertToDraft", to: "DRAFT" }],
  COMPLETED: [],
};

type Confirm =
  | { kind: "status"; key: string; to: OfferStatus }
  | { kind: "delete" }
  | { kind: "markSentAfterShare" };

interface OfferActionsProps {
  offerId: string;
  offerNumber: string;
  status: OfferStatus;
  locale: string;
  isAdmin: boolean;
}

export function OfferActions({ offerId, offerNumber, status, locale, isAdmin }: OfferActionsProps) {
  const t = useTranslations("offers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const pdfFileRef = useRef<File | null>(null);

  const pdfUrl = `/api/offers/${offerId}/pdf`;
  const xlsUrl = `/api/offers/${offerId}/xls?locale=${locale}`;
  const primary = PRIMARY_ACTION[status];
  const secondary = SECONDARY_ACTIONS[status] ?? [];
  const isDraft = status === "DRAFT";
  const busy = pending !== null;

  function changeStatus(to: OfferStatus) {
    setPending(to);
    startTransition(async () => {
      const result = await updateOfferStatus(offerId, to);
      if (result.success) toast.success(t(`statuses.${to}`));
      else toast.error(result.error);
      setPending(null);
      router.refresh();
    });
  }

  function handleDelete() {
    setPending("delete");
    startTransition(async () => {
      const result = await deleteOffer(offerId);
      if (!result.success) {
        toast.error(result.error);
        setPending(null);
        return;
      }
      router.push(`/${locale}/offers`);
    });
  }

  function handleDuplicate() {
    setPending("duplicate");
    startTransition(async () => {
      const result = await duplicateOffer(offerId);
      if (!result.success || !result.data) {
        toast.error(result.success ? "Error" : result.error);
        setPending(null);
        return;
      }
      toast.success(t("actions.duplicated"));
      router.push(`/${locale}/offers/${result.data.id}/edit`);
    });
  }

  async function handleShare() {
    // Phones: share the PDF file itself (WhatsApp, Viber, mail…).
    // The file is cached so a second tap can share instantly if the browser
    // rejected the first attempt because the download took too long.
    try {
      let file = pdfFileRef.current;
      if (!file) {
        setPending("share");
        const res = await fetch(pdfUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        file = new File([blob], `${offerNumber}.pdf`, { type: "application/pdf" });
        pdfFileRef.current = file;
        setPending(null);
      }

      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (!canShareFiles) {
        window.open(pdfUrl, "_blank", "noopener,noreferrer");
        return;
      }

      await navigator.share({ files: [file], title: offerNumber });
      if (isDraft) setConfirm({ kind: "markSentAfterShare" });
    } catch (err) {
      setPending(null);
      const name = (err as { name?: string })?.name;
      if (name === "AbortError") return; // user closed the share sheet
      if (name === "NotAllowedError") {
        toast(t("share.tapAgain"));
        return;
      }
      toast.error(t("share.failed"));
    }
  }

  function runConfirm() {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    if (c.kind === "delete") handleDelete();
    else if (c.kind === "status") changeStatus(c.to);
    else if (c.kind === "markSentAfterShare") changeStatus("SENT");
  }

  const primaryButton = (className?: string) =>
    primary ? (
      <Button className={className} disabled={busy} onClick={() => changeStatus(primary.to)}>
        {pending === primary.to && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
        {t(`actions.${primary.key}`)}
      </Button>
    ) : null;

  const shareButton = (className?: string, iconOnly = false) => (
    <Button variant="outline" className={className} disabled={busy} onClick={handleShare} title={t("actions.sharePdf")}>
      {pending === "share" ? (
        <Loader2 className={cn("h-4 w-4 animate-spin", !iconOnly && "mr-1.5")} />
      ) : (
        <Share2 className={cn("h-4 w-4", !iconOnly && "mr-1.5")} />
      )}
      {!iconOnly && t("actions.sharePdf")}
    </Button>
  );

  const menu = (triggerClassName?: string) => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className={triggerClassName} disabled={busy} aria-label={tc("more")}>
          {pending === "duplicate" || pending === "delete" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild className="py-2.5 md:py-1.5">
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
            <FileDown className="mr-2 h-4 w-4" />
            {t("actions.downloadPdf")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="py-2.5 md:py-1.5">
          <a href={xlsUrl} download>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t("actions.downloadXls")}
          </a>
        </DropdownMenuItem>
        {isDraft && (
          <DropdownMenuItem asChild className="py-2.5 md:hidden">
            <Link href={`/${locale}/offers/${offerId}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              {tc("edit")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="py-2.5 md:py-1.5" onSelect={handleDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          {t("actions.duplicate")}
        </DropdownMenuItem>

        {secondary.length > 0 && <DropdownMenuSeparator />}
        {secondary.map((a) => (
          <DropdownMenuItem
            key={a.to}
            className={cn("py-2.5 md:py-1.5", a.to === "REJECTED" && "text-destructive focus:text-destructive")}
            onSelect={() => setConfirm({ kind: "status", key: a.key, to: a.to })}
          >
            {a.to === "REJECTED" ? <X className="mr-2 h-4 w-4" /> : <Undo2 className="mr-2 h-4 w-4" />}
            {t(`actions.${a.key}`)}
          </DropdownMenuItem>
        ))}

        {isDraft && isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="py-2.5 text-destructive focus:text-destructive md:py-1.5"
              onSelect={() => setConfirm({ kind: "delete" })}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tc("delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const confirmText = (() => {
    if (!confirm) return null;
    if (confirm.kind === "delete") {
      return {
        title: t("deleteTitle"),
        desc: t("deleteConfirm", { name: offerNumber }),
        action: tc("delete"),
        destructive: true,
      };
    }
    if (confirm.kind === "markSentAfterShare") {
      return {
        title: t("share.markSentTitle"),
        desc: t("share.markSentDesc", { number: offerNumber }),
        action: t("actions.markAsSent"),
        destructive: false,
      };
    }
    return {
      title: t(`actions.${confirm.key}`),
      desc: t(`confirm.${confirm.key}`, { number: offerNumber }),
      action: t(`actions.${confirm.key}`),
      destructive: confirm.to === "REJECTED",
    };
  })();

  return (
    <>
      {/* Desktop / tablet: inline in the page header */}
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        {isDraft && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/${locale}/offers/${offerId}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {tc("edit")}
            </Link>
          </Button>
        )}
        {shareButton("h-8 px-3 text-sm")}
        {menu("h-8 w-8")}
        {primaryButton("h-8 px-3 text-sm")}
      </div>

      {/* Phone: fixed bottom bar, thumb-reachable */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <div className="flex items-center gap-2">
          {menu("h-11 w-11 shrink-0")}
          {primary ? shareButton("h-11 w-11 shrink-0 px-0", true) : shareButton("h-11 flex-1")}
          {isDraft && (
            <Button asChild variant="outline" className="h-11 w-11 shrink-0 px-0" title={tc("edit")}>
              <Link href={`/${locale}/offers/${offerId}/edit`}>
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
          )}
          {primaryButton("h-11 flex-1")}
        </div>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmText?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmText?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirm}
              className={cn(
                confirmText?.destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {confirmText?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
