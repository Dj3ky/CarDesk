"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ArrowRightLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { getProductByNumber } from "../actions/get-product-by-number";
import { priceExVat, priceIncVat, formatEur } from "../lib/price";
import type { ProductListItem } from "../types";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; product: ProductListItem }
  | { status: "not-found" };

interface SubstitutionPartCellProps {
  substitutionPart: string | null;
}

export function SubstitutionPartCell({ substitutionPart }: SubstitutionPartCellProps) {
  const t = useTranslations("products");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<LoadState>({ status: "idle" });

  if (!substitutionPart) {
    return <span className="text-muted-foreground">—</span>;
  }

  async function handleOpen() {
    setOpen(true);
    if (state.status !== "idle") return;
    setState({ status: "loading" });
    const result = await getProductByNumber(substitutionPart!);
    setState(result ? { status: "found", product: result } : { status: "not-found" });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1 font-mono text-sm text-amber-600 hover:text-amber-700 hover:underline dark:text-amber-400 dark:hover:text-amber-300"
      >
        <ArrowRightLeft className="h-3 w-3 shrink-0" />
        {substitutionPart}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-amber-500" />
              {t("substitutionPopup.title")}
            </DialogTitle>
          </DialogHeader>

          {state.status === "loading" && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {state.status === "not-found" && (
            <p className="py-4 text-sm text-muted-foreground">
              {t("substitutionPopup.notFound")}{" "}
              <span className="font-mono font-semibold">{substitutionPart}</span>
            </p>
          )}

          {state.status === "found" && (() => {
            const p = state.product;
            const exVat = priceExVat(p.price);
            const incVat = priceIncVat(p.price, p.vatRate);
            const vatPct = parseFloat(p.vatRate);
            return (
              <div className="space-y-3 py-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-semibold">{p.productNumber}</span>
                    {!p.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        {t("substitutionPopup.inactive")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{p.description}</p>
                </div>

                {(p.brand || p.supplier) && (
                  <div className="flex gap-4 text-sm">
                    {p.brand && (
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{t("fields.brand")}:</span>{" "}
                        {p.brand}
                      </span>
                    )}
                    {p.supplier && (
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground">{t("fields.supplier")}:</span>{" "}
                        {p.supplier}
                      </span>
                    )}
                  </div>
                )}

                <div className="rounded-md border bg-muted/40 p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("substitutionPopup.priceExVat")}</span>
                    <span className="font-medium tabular-nums">{formatEur(exVat)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT {vatPct}%</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatEur(incVat - exVat)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 text-sm font-semibold">
                    <span>{t("substitutionPopup.priceIncVat")}</span>
                    <span className="tabular-nums">{formatEur(incVat)}</span>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("substitutionPopup.stock")}</span>
                  <span className={`font-medium tabular-nums ${p.stock <= 0 ? "text-destructive" : ""}`}>
                    {p.stock} {p.unit}
                  </span>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
