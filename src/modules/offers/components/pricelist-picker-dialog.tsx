"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2, ArrowRight, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MOBILE_FULLSCREEN_DIALOG } from "../lib/mobile-dialog";
import { searchProductsForOffer } from "../actions/search-products";
import type { ProductSearchResult } from "../types";

interface PricelistPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (product: ProductSearchResult, quantity: number) => void;
}

export function PricelistPickerDialog({ open, onClose, onAdd }: PricelistPickerDialogProps) {
  const t = useTranslations("offers.productSearch");
  const tp = useTranslations("offers.pricelistPicker");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addedCount, setAddedCount] = useState(0);
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exactRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearched(false);
      setQuantities({});
      setAddedCount(0);
      setJustAdded({});
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }
    const exact = exactRef.current;
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const found = await searchProductsForOffer(q, exact);
        setResults(found);
        setSearched(true);
      });
    }, exact ? 0 : 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function getQty(id: string) {
    return quantities[id] ?? 1;
  }

  function setQty(id: string, raw: string) {
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) {
      setQuantities((prev) => ({ ...prev, [id]: val }));
    }
  }

  function handleAdd(product: ProductSearchResult) {
    onAdd(product, getQty(product.id));
    setAddedCount((c) => c + 1);
    setJustAdded((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => setJustAdded((prev) => ({ ...prev, [product.id]: false })), 1500);
    exactRef.current = false;
    setQuery("");
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className={cn(MOBILE_FULLSCREEN_DIALOG, "gap-4 sm:max-w-4xl")}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>{tp("title")}</DialogTitle>
            {addedCount > 0 && (
              <Badge variant="secondary">{tp("addedCount", { count: addedCount })}</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Input
            ref={inputRef}
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => { exactRef.current = false; setQuery(e.target.value); }}
            className="h-11 pl-9 pr-9 text-base sm:h-9 sm:text-sm"
            autoFocus
          />
        </div>

        {!query.trim() && (
          <p className="text-sm text-muted-foreground text-center py-4">{tp("startTyping")}</p>
        )}

        {searched && query.trim() && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">{t("noResults")}</p>
        )}

        {results.length > 0 && (
          <div className="min-h-0 flex-1 divide-y overflow-y-auto rounded-md border sm:max-h-[400px] sm:flex-none">
            {results.map((p) => (
              <div key={p.id}>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors sm:flex-nowrap">
                  <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                    <p className="font-mono text-xs text-muted-foreground">{p.productNumber}</p>
                    <p className="text-sm font-medium truncate">{p.description}</p>
                    {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                  </div>

                  <div className="mr-auto shrink-0 sm:mr-0 sm:text-right">
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

                  <Input
                    type="number"
                    min="0.001"
                    step="1"
                    value={getQty(p.id)}
                    onChange={(e) => setQty(p.id, e.target.value)}
                    inputMode="decimal"
                    className="h-10 w-16 shrink-0 text-center text-base sm:h-8 sm:text-sm"
                    aria-label={tp("qtyLabel")}
                  />

                  <Button
                    type="button"
                    size="sm"
                    variant={justAdded[p.id] ? "secondary" : "default"}
                    className="h-10 w-12 shrink-0 sm:h-8 sm:w-20"
                    onClick={() => handleAdd(p)}
                  >
                    {justAdded[p.id] ? (
                      <><Check className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{tp("added")}</span></>
                    ) : (
                      <><Plus className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">{tp("add")}</span></>
                    )}
                  </Button>
                </div>

                {p.substitutionPart && (
                  <div className="flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950 px-4 py-2">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {t("replacedBy")}{" "}
                      <span className="font-mono font-semibold">{p.substitutionPart}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => { exactRef.current = true; setQuery(p.substitutionPart!); }}
                      className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      {t("searchSubstitution")} <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button type="button" className="h-11 px-6 sm:h-9" onClick={onClose}>
            {tp("done")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
