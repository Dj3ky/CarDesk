"use client";

import { useState, useTransition } from "react";
import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, Trash2, PackageSearch, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calcItem, formatCurrency } from "../lib/calculations";
import { searchProductsForOffer } from "@/modules/offers/actions/search-products";
import { ProductSearchDialog } from "@/modules/offers/components/product-search-dialog";
import { PricelistPickerDialog } from "@/modules/offers/components/pricelist-picker-dialog";
import type { ProductSearchResult } from "@/modules/offers/types";
import type { WorkOrderFormValues } from "../schemas/work-order.schema";

const VAT_PRESETS = [0, 5, 9.5, 22];
const UNITS = ["pcs", "h", "m", "kg", "l", "set", "pair"] as const;

interface PartsEditorProps {
  form: UseFormReturn<WorkOrderFormValues>;
  currency?: string;
  defaultVATRate?: number;
}

export function PartsEditor({ form, currency = "EUR", defaultVATRate = 22 }: PartsEditorProps) {
  const t = useTranslations("workOrders");
  const tUnits = useTranslations("products.units");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { register, watch, setValue, formState: { errors } } = form;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchRowIndex, setSearchRowIndex] = useState<number | null>(null);
  const [pricelistOpen, setPricelistOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isPending, startSearchTransition] = useTransition();

  const items = watch("items") ?? [];

  function addPart() {
    append({ description: "", quantity: 1, unit: "pcs", pricePerUnit: 0, vatRate: defaultVATRate, discount: 0 });
  }

  function openSearch(index: number) {
    setSearchRowIndex(index);
    setSearchOpen(true);
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
    setSearchRowIndex(null);
  }

  function handlePricelistAdd(product: ProductSearchResult, quantity: number) {
    append({
      productId: product.id,
      productNumber: product.productNumber,
      description: product.description,
      quantity,
      unit: product.unit,
      pricePerUnit: parseFloat(product.adjustedPrice ?? product.price),
      vatRate: parseFloat(product.vatRate),
      discount: 0,
    });
  }

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          {t("parts.noParts")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pl-1 pr-2 w-8" />
                <th className="py-2 px-2 text-left font-medium min-w-[200px]">{t("parts.description")}</th>
                <th className="py-2 px-2 text-right font-medium w-20">{t("parts.qty")}</th>
                <th className="py-2 px-2 text-center font-medium w-20">{t("parts.unit")}</th>
                <th className="py-2 px-2 text-right font-medium w-24">{t("parts.price")}</th>
                <th className="py-2 px-2 text-right font-medium w-20">{t("parts.vatRate")}</th>
                <th className="py-2 px-2 text-right font-medium w-24">{t("detail.total")}</th>
                <th className="py-2 pl-2 pr-1 w-8" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const item = items[index];
                const calc = item ? calcItem(item) : null;
                const errs = errors.items?.[index];

                return (
                  <tr key={field.id} className="border-b hover:bg-muted/30">
                    <td className="py-1.5 pl-1 pr-2 align-top pt-3 text-center">
                      <button
                        type="button"
                        title={t("parts.searchTitle")}
                        onClick={() => openSearch(index)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <PackageSearch className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="py-1.5 px-2 align-top">
                      <Input
                        {...register(`items.${index}.productNumber`)}
                        placeholder={t("parts.partNumber")}
                        className="h-7 text-xs font-mono mb-1"
                      />
                      <Input
                        {...register(`items.${index}.description`)}
                        placeholder={`${t("parts.description")} *`}
                        className={`h-8 ${errs?.description ? "border-destructive" : ""}`}
                      />
                      {errs?.description && (
                        <p className="text-xs text-destructive mt-0.5">{errs.description.message}</p>
                      )}
                    </td>
                    <td className="py-1.5 px-2 align-top pt-3">
                      <Input
                        {...register(`items.${index}.quantity`)}
                        type="number"
                        step="0.001"
                        min="0"
                        className="h-8 text-right w-20"
                      />
                    </td>
                    <td className="py-1.5 px-2 align-top pt-3">
                      <select
                        {...register(`items.${index}.unit`)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{tUnits(u)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2 align-top pt-3">
                      <Input
                        {...register(`items.${index}.pricePerUnit`)}
                        type="number"
                        step="0.01"
                        min="0"
                        className="h-8 text-right w-24"
                      />
                    </td>
                    <td className="py-1.5 px-2 align-top pt-3">
                      <select
                        {...register(`items.${index}.vatRate`)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {VAT_PRESETS.map((v) => (
                          <option key={v} value={v}>{v}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium align-top pt-3 whitespace-nowrap">
                      {calc ? formatCurrency(calc.lineTotal, currency) : "—"}
                    </td>
                    <td className="py-1.5 pl-2 pr-1 align-top pt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addPart}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("parts.addPart")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPricelistOpen(true)}>
          <Library className="mr-1.5 h-4 w-4" />
          {t("parts.browseButton")}
        </Button>
      </div>

      <ProductSearchDialog
        open={searchOpen}
        onClose={() => { setSearchOpen(false); setSearchRowIndex(null); }}
        onSelect={handleProductSelect}
      />

      <PricelistPickerDialog
        open={pricelistOpen}
        onClose={() => setPricelistOpen(false)}
        onAdd={handlePricelistAdd}
      />
    </div>
  );
}
