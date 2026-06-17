"use client";

import { useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import type { Control, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, Trash2, PackageSearch, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductSearchDialog } from "./product-search-dialog";
import { PricelistPickerDialog } from "./pricelist-picker-dialog";
import { calcItem, calcTotals, formatCurrency } from "../lib/calculations";
import { UNITS } from "../schemas/offer.schema";
import type { OfferFormValues } from "../schemas/offer.schema";
import type { ProductSearchResult } from "../types";

const VAT_PRESETS = [0, 5, 9.5, 22];

interface LineItemsEditorProps {
  control: Control<OfferFormValues>;
  register: UseFormRegister<OfferFormValues>;
  setValue: UseFormSetValue<OfferFormValues>;
  defaultVATRate: number;
  defaultDiscount: number;
  currency: string;
}

export function LineItemsEditor({
  control,
  register,
  setValue,
  defaultVATRate,
  defaultDiscount,
  currency,
}: LineItemsEditorProps) {
  const t = useTranslations("offers");
  const tUnits = useTranslations("products.units");
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" }) ?? [];
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchRowIndex, setSearchRowIndex] = useState<number | null>(null);
  const [pricelistOpen, setPricelistOpen] = useState(false);

  function addItem() {
    append({
      productNumber: "",
      description: "",
      quantity: 1,
      unit: "pcs",
      pricePerUnit: 0,
      vatRate: defaultVATRate,
      discount: defaultDiscount,
    });
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
    setValue(`items.${i}.vatRate`, parseFloat(product.vatRate));
    setValue(`items.${i}.unit`, product.unit);
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
      discount: defaultDiscount,
    });
  }

  const totals = calcTotals(items);

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          {t("items.noItems")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 pl-1 pr-2 text-left font-medium w-8">#</th>
                <th className="py-2 px-2 text-left font-medium w-[140px]">
                  {t("items.productNumber")}
                </th>
                <th className="py-2 px-2 text-left font-medium min-w-[220px]">
                  {t("items.description")}
                </th>
                <th className="py-2 px-2 text-right font-medium w-20">
                  {t("items.quantity")}
                </th>
                <th className="py-2 px-2 text-center font-medium w-20">
                  {t("items.unit")}
                </th>
                <th className="py-2 px-2 text-right font-medium w-24">
                  {t("items.pricePerUnit")}
                </th>
                <th className="py-2 px-2 text-right font-medium w-20">
                  {t("items.vatRate")}
                </th>
                <th className="py-2 px-2 text-right font-medium w-20">
                  {t("items.discount")}
                </th>
                <th className="py-2 px-2 text-right font-medium w-24">
                  {t("items.lineTotal")}
                </th>
                <th className="py-2 pl-2 pr-1 w-8" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const item = items[index];
                const calc = item ? calcItem(item) : null;

                return (
                  <tr key={field.id} className="border-b hover:bg-muted/30">
                    <td className="py-1.5 pl-1 pr-2 text-center align-top pt-3">
                      <button
                        type="button"
                        title={t("items.searchProduct")}
                        onClick={() => openSearch(index)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <PackageSearch className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="py-1.5 px-2 align-top pt-3">
                      <Input
                        {...register(`items.${index}.productNumber`)}
                        placeholder={t("items.productNumber")}
                        className="h-8 text-xs font-mono w-[130px]"
                      />
                    </td>
                    <td className="py-1.5 px-2 align-top pt-3">
                      <Input
                        {...register(`items.${index}.description`)}
                        placeholder={`${t("items.description")} *`}
                        className="h-8"
                      />
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
                    <td className="py-1.5 px-2 align-top pt-3">
                      <Input
                        {...register(`items.${index}.discount`)}
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="h-8 text-right w-20"
                      />
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

      <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("items.addItem")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setPricelistOpen(true)}>
            <Library className="mr-1.5 h-4 w-4" />
            {t("pricelistPicker.browseButton")}
          </Button>
        </div>

        {items.length > 0 && (
          <div className="space-y-1 text-sm sm:min-w-[220px] sm:text-right">
            <div className="flex justify-between gap-8 text-muted-foreground">
              <span>{t("totals.subtotal")}</span>
              <span className="font-medium text-foreground">
                {formatCurrency(totals.subtotalExVat, currency)}
              </span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between gap-8 text-muted-foreground">
                <span>{t("totals.discount")}</span>
                <span className="text-emerald-600">−{formatCurrency(totals.totalDiscount, currency)}</span>
              </div>
            )}
            {totals.vatBreakdown.map(({ rate, amount }) => (
              <div key={rate} className="flex justify-between gap-8 text-muted-foreground">
                <span>{t("totals.vat", { rate })}</span>
                <span>{formatCurrency(amount, currency)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-8 border-t pt-1 font-semibold">
              <span>{t("totals.grandTotal")}</span>
              <span>{formatCurrency(totals.grandTotal, currency)}</span>
            </div>
          </div>
        )}
      </div>

      <ProductSearchDialog
        open={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setSearchRowIndex(null);
        }}
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
