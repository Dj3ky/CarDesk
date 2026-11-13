"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2, ArrowRight, Check, Plus, Minus } from "lucide-react";
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
  /** Called for every "Add" tap; the dialog stays open so several parts can be added. */
  onAdd: (product: ProductSearchResult, quantity: number) => void;
}

/** "Add from pricelist": search the catalog and add parts with a quantity. */
export function ProductSearchDialog({ open, onClose, onAdd }: ProductSearchDialogProps) {
  const t = useTranslations("offers.productSearch");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [addedCount, setAddedCount] = useState(0);
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const exactRef = useRef(false);

  function reset() {
    setQuery("");
    setResults([]);
    setSearched(false);
    setAddedCount(0);
    setJustAdded({});
    setQuantities({});
    exactRef.current = false;
  }

  function close() {
    onClose();
    reset();
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

  function getQty(id: string) {
    return quantities[id] ?? 1;
  }

  function setQty(id: string, value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    setQuantities((prev) => ({ ...prev, [id]: Math.round(value * 1000) / 1000 }));
  }

  function handleAdd(product: ProductSearchResult) {
    onAdd(product, getQty(product.id));
    setAddedCount((c) => c + 1);
    setJustAdded((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => setJustAdded((prev) => ({ ...prev, [product.id]: false })), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
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
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-xs text-muted-foreground">{p.productNumber}</p>
                        <p className="text-sm font-medium line-clamp-2">{p.description}</p>
                        {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                      </div>
                      <div className="shrink-0 text-right">
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
                    </div>

                    {/* Quantity stepper + add */}
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <div className="flex items-center rounded-md border">
                        <button
                          type="button"
                          aria-label="−"
                          onClick={() => setQty(p.id, getQty(p.id) - 1)}
                          disabled={getQty(p.id) <= 1}
                          className="flex h-10 w-10 items-center justify-center text-muted-foreground disabled:opacity-40 sm:h-8 sm:w-8"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          aria-label={t("qtyLabel")}
                          value={getQty(p.id)}
                          onChange={(e) => setQty(p.id, parseFloat(e.target.value))}
                          className="h-10 w-12 border-x bg-transparent text-center text-base focus:outline-none sm:h-8 sm:text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          aria-label="+"
                          onClick={() => setQty(p.id, getQty(p.id) + 1)}
                          className="flex h-10 w-10 items-center justify-center text-muted-foreground sm:h-8 sm:w-8"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant={justAdded[p.id] ? "secondary" : "default"}
                        className={cn(
                          "h-10 min-w-24 sm:h-8",
                          justAdded[p.id] && "text-emerald-700 dark:text-emerald-400"
                        )}
                        onClick={() => handleAdd(p)}
                      >
                        {justAdded[p.id] ? (
                          <><Check className="mr-1 h-4 w-4" />{t("added")}</>
                        ) : (
                          <><Plus className="mr-1 h-4 w-4" />{t("add")}</>
                        )}
                      </Button>
                    </div>
                  </div>

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

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <span className="text-sm text-muted-foreground">
            {addedCount > 0 ? t("addedCount", { count: addedCount }) : ""}
          </span>
          <Button type="button" className="h-11 px-6 sm:h-9" onClick={close}>
            {t("done")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
