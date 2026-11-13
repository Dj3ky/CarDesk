"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2, ArrowRight, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchProductsForOffer } from "../actions/search-products";
import { MOBILE_FULLSCREEN_DIALOG } from "../lib/mobile-dialog";
import type { ProductSearchResult } from "../types";

interface ProductSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (product: ProductSearchResult) => void;
  /**
   * When true the dialog stays open after a product is picked so several parts
   * can be added in a row. Default: close after the first pick.
   */
  keepOpen?: boolean;
}

export function ProductSearchDialog({
  open,
  onClose,
  onSelect,
  keepOpen = false,
}: ProductSearchDialogProps) {
  const t = useTranslations("offers.productSearch");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [addedCount, setAddedCount] = useState(0);
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({});
  const exactRef = useRef(false);

  function reset() {
    setQuery("");
    setResults([]);
    setSearched(false);
    setAddedCount(0);
    setJustAdded({});
    exactRef.current = false;
  }

  // Search as you type (debounced). Exact substitution lookups run immediately.
  // Queries shorter than 2 chars show nothing (derived below, no state reset needed).
  const active = query.trim().length >= 2;
  const shownResults = active ? results : [];
  const shownSearched = active && searched;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const exact = exactRef.current;
    exactRef.current = false;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const found = await searchProductsForOffer(q, exact);
        setResults(found);
        setSearched(true);
      });
    }, exact ? 0 : 300);
    return () => clearTimeout(timer);
  }, [query]);

  function searchExact(q: string) {
    exactRef.current = true;
    setQuery(q);
  }

  function handleSelect(product: ProductSearchResult) {
    onSelect(product);
    if (keepOpen) {
      setAddedCount((c) => c + 1);
      setJustAdded((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => setJustAdded((prev) => ({ ...prev, [product.id]: false })), 1500);
      return;
    }
    onClose();
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent className={cn(MOBILE_FULLSCREEN_DIALOG, "sm:max-w-lg")}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            enterKeyHint="search"
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-9 pr-9 text-base sm:h-9 sm:text-sm"
            autoFocus
          />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto sm:max-h-[60vh] sm:flex-none">
          {!shownSearched && shownResults.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("typeToSearch")}</p>
          )}

          {shownSearched && shownResults.length === 0 && !isPending && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noResults")}</p>
          )}

          {shownResults.length > 0 && (
            <div className="divide-y rounded-md border">
              {shownResults.map((p) => (
                <div key={p.id} className="divide-y">
                  <button
                    type="button"
                    onClick={() => handleSelect(p)}
                    className="w-full px-4 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{p.productNumber}</p>
                        <p className="text-sm font-medium line-clamp-2">{p.description}</p>
                        {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                      </div>
                      <div className="flex shrink-0 items-start gap-2">
                        <div className="text-right">
                          {p.adjustedPrice ? (
                            <>
                              <p className="text-sm font-semibold">
                                {parseFloat(p.adjustedPrice).toFixed(2)}{" "}
                                <span className="text-xs font-normal text-muted-foreground">{t("exVat")}</span>
                              </p>
                              <p className="text-xs text-muted-foreground line-through">
                                {parseFloat(p.price).toFixed(2)}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm font-semibold">
                              {parseFloat(p.price).toFixed(2)}{" "}
                              <span className="text-xs font-normal text-muted-foreground">{t("exVat")}</span>
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">{t("vatLine", { rate: p.vatRate })}</p>
                        </div>
                        {keepOpen && (
                          <span
                            className={cn(
                              "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
                              justAdded[p.id]
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "text-muted-foreground"
                            )}
                          >
                            {justAdded[p.id] ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {p.substitutionPart && (
                    <div className="flex items-center justify-between gap-2 bg-amber-50 px-4 py-2 dark:bg-amber-950">
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        {t("replacedBy")}{" "}
                        <span className="font-mono font-semibold">{p.substitutionPart}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => searchExact(p.substitutionPart!)}
                        className="flex items-center gap-1 py-1 text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
                      >
                        {t("searchSubstitution")} <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {keepOpen && (
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <span className="text-sm text-muted-foreground">
              {addedCount > 0 ? t("addedCount", { count: addedCount }) : ""}
            </span>
            <Button
              type="button"
              className="h-11 px-6 sm:h-9"
              onClick={() => {
                onClose();
                reset();
              }}
            >
              {t("done")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
