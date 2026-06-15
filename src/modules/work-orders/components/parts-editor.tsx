"use client";

import { useState, useTransition } from "react";
import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { PlusCircle, Trash2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, calcItem } from "../lib/calculations";
import { searchProductsForOffer } from "@/modules/offers/actions/search-products";
import type { ProductSearchResult } from "@/modules/offers/types";
import type { WorkOrderFormValues } from "../schemas/work-order.schema";

const VAT_PRESETS = [0, 5, 9.5, 22];

interface PartsEditorProps {
  form: UseFormReturn<WorkOrderFormValues>;
  currency?: string;
  defaultVATRate?: number;
}

export function PartsEditor({ form, currency = "EUR", defaultVATRate = 22 }: PartsEditorProps) {
  const t = useTranslations("workOrders.parts");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { register, watch, setValue, formState: { errors } } = form;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchRowIndex, setSearchRowIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, startSearchTransition] = useTransition();

  const items = watch("items");

  function addPart() {
    append({ description: "", quantity: 1, unit: "pcs", pricePerUnit: 0, vatRate: defaultVATRate, discount: 0 });
  }

  function openSearch(index: number) {
    setSearchRowIndex(index);
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(true);
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    startSearchTransition(async () => {
      const results = await searchProductsForOffer(query);
      setSearchResults(results);
    });
  }

  function handleProductSelect(product: ProductSearchResult) {
    if (searchRowIndex === null) return;
    const i = searchRowIndex;
    setValue(`items.${i}.productId`, product.id);
    setValue(`items.${i}.productNumber`, product.productNumber);
    setValue(`items.${i}.description`, product.description);
    setValue(`items.${i}.pricePerUnit`, parseFloat(product.adjustedPrice ?? product.price));
    setValue(`items.${i}.unit`, product.unit);
    setValue(`items.${i}.vatRate`, parseFloat(product.vatRate));
    setSearchOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">{t("title")}</h3>
        <Button type="button" variant="outline" size="sm" onClick={addPart}>
          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
          {t("addPart")}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">{t("noParts")}</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => {
            const item = items?.[index];
            const { lineTotal } = calcItem(item ?? {});
            const errs = errors.items?.[index];

            return (
              <div key={field.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-28 shrink-0">
                    <div className="relative">
                      <Input
                        placeholder={t("partNumber")}
                        {...register(`items.${index}.productNumber`)}
                        className="pr-8 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => openSearch(index)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <Search className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder={t("description")}
                      {...register(`items.${index}.description`)}
                      className={errs?.description ? "border-destructive" : ""}
                    />
                    {errs?.description && (
                      <p className="text-xs text-destructive mt-0.5">{errs.description.message}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">{t("qty")}</label>
                    <Input type="number" step="0.001" min="0" placeholder="1" {...register(`items.${index}.quantity`)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t("unit")}</label>
                    <Input placeholder="pcs" {...register(`items.${index}.unit`)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t("price")}</label>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...register(`items.${index}.pricePerUnit`)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">{t("vatRate")}</label>
                    <select
                      {...register(`items.${index}.vatRate`)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {VAT_PRESETS.map((v) => <option key={v} value={v}>{v}%</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(lineTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("searchTitle")}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="mt-2 max-h-72 overflow-y-auto space-y-1">
            {isSearching && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("searching")}
              </div>
            )}
            {!isSearching && searchResults.length === 0 && searchQuery && (
              <p className="text-sm text-muted-foreground py-4 text-center">{t("noResults")}</p>
            )}
            {searchResults.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleProductSelect(product)}
                className="w-full text-left rounded-md px-3 py-2.5 hover:bg-accent transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{product.productNumber}</span>
                    <p className="text-sm font-medium">{product.description}</p>
                    {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {product.adjustedPrice ? (
                      <>
                        <p className="text-sm font-semibold">{formatCurrency(parseFloat(product.adjustedPrice), "EUR")}</p>
                        <p className="text-xs text-muted-foreground line-through">{formatCurrency(parseFloat(product.price), "EUR")}</p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold">{formatCurrency(parseFloat(product.price), "EUR")}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
