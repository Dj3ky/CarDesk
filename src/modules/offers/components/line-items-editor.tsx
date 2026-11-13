"use client";

import { useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import type { Control, UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Trash2, PackageSearch, Library, Search, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { ProductSearchDialog } from "./product-search-dialog";
import { PricelistPickerDialog } from "./pricelist-picker-dialog";
import { calcItem, calcTotals, formatCurrency } from "../lib/calculations";
import { UNITS } from "../schemas/offer.schema";
import type { OfferFormValues } from "../schemas/offer.schema";
import type { ProductSearchResult } from "../types";

const VAT_PRESETS = [0, 5, 9.5, 22];

const selectCls =
  "w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring";

interface LineItemsEditorProps {
  control: Control<OfferFormValues>;
  register: UseFormRegister<OfferFormValues>;
  setValue: UseFormSetValue<OfferFormValues>;
  errors: FieldErrors<OfferFormValues>;
  isSubmitted: boolean;
  defaultVATRate: number;
  defaultDiscount: number;
  currency: string;
}

export function LineItemsEditor({
  control,
  register,
  setValue,
  errors,
  isSubmitted,
  defaultVATRate,
  defaultDiscount,
  currency,
}: LineItemsEditorProps) {
  const t = useTranslations("offers");
  const tc = useTranslations("common");
  const tUnits = useTranslations("products.units");
  const isMobile = useIsMobile();
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" }) ?? [];
  const [searchOpen, setSearchOpen] = useState(false);
  /** null = "add part" mode (append, stay open); number = replace that row. */
  const [searchRowIndex, setSearchRowIndex] = useState<number | null>(null);
  const [pricelistOpen, setPricelistOpen] = useState(false);

  function addEmptyItem() {
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

  function appendProduct(product: ProductSearchResult, quantity = 1) {
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

  function openSearch(index: number | null) {
    setSearchRowIndex(index);
    setSearchOpen(true);
  }

  function handleProductSelect(product: ProductSearchResult) {
    if (searchRowIndex === null) {
      appendProduct(product);
      return;
    }
    const i = searchRowIndex;
    setValue(`items.${i}.productId`, product.id, { shouldDirty: true });
    setValue(`items.${i}.productNumber`, product.productNumber, { shouldDirty: true });
    setValue(`items.${i}.description`, product.description, { shouldDirty: true });
    setValue(`items.${i}.pricePerUnit`, parseFloat(product.adjustedPrice ?? product.price), { shouldDirty: true });
    setValue(`items.${i}.vatRate`, parseFloat(product.vatRate), { shouldDirty: true });
    setValue(`items.${i}.unit`, product.unit, { shouldDirty: true });
  }

  const totals = calcTotals(items);

  const descError = (index: number) => isSubmitted && errors.items?.[index]?.description;
  const qtyError = (index: number) => isSubmitted && errors.items?.[index]?.quantity;

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {t("items.noItems")}
        </div>
      ) : isMobile ? (
        /* ── Phone: one card per item ── */
        <div className="space-y-3">
          {fields.map((field, index) => {
            const item = items[index];
            const calc = item ? calcItem(item) : null;
            const vat = item?.vatRate ?? defaultVATRate;
            const disc = Number(item?.discount ?? 0);
            return (
              <div key={field.id} className="rounded-lg border bg-card p-3 shadow-xs">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <Input
                    {...register(`items.${index}.productNumber`)}
                    placeholder={t("items.productNumber")}
                    className="h-9 min-w-0 flex-1 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title={t("items.searchProduct")}
                    onClick={() => openSearch(index)}
                  >
                    <PackageSearch className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    title={tc("delete")}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Input
                  {...register(`items.${index}.description`)}
                  placeholder={`${t("items.description")} *`}
                  className={cn(
                    "h-10 text-base",
                    descError(index) && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {descError(index) && errors.items?.[index]?.description?.message && (
                  <p className="mt-0.5 text-xs text-destructive">{errors.items[index]!.description!.message}</p>
                )}

                <div className="mt-2 grid grid-cols-[1fr_5.5rem_1.3fr] gap-2">
                  <label className="space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">{t("items.quantity")}</span>
                    <Input
                      {...register(`items.${index}.quantity`)}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      className={cn(
                        "h-10 text-right text-base",
                        qtyError(index) && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">{t("items.unit")}</span>
                    <select {...register(`items.${index}.unit`)} className={cn(selectCls, "h-10 text-base")}>
                      {UNITS.map((u) => (
                        <option key={u} value={u}>{tUnits(u)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-[11px] text-muted-foreground">{t("items.pricePerUnit")}</span>
                    <Input
                      {...register(`items.${index}.pricePerUnit`)}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      className="h-10 text-right text-base"
                    />
                  </label>
                </div>

                <details className="group mt-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1 text-xs text-muted-foreground">
                    <span className="underline-offset-2 group-open:underline">
                      {t("items.vatRate")} {vat}% · {t("items.discount")} {disc > 0 ? `${disc}%` : "—"}
                    </span>
                    <span className="text-base font-semibold text-foreground">
                      {calc ? formatCurrency(calc.lineTotal, currency) : "—"}
                    </span>
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="space-y-0.5">
                      <span className="text-[11px] text-muted-foreground">{t("items.vatRate")}</span>
                      <select {...register(`items.${index}.vatRate`)} className={cn(selectCls, "h-10 text-base")}>
                        {VAT_PRESETS.map((v) => (
                          <option key={v} value={v}>{v}%</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-[11px] text-muted-foreground">{t("items.discount")}</span>
                      <Input
                        {...register(`items.${index}.discount`)}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        max="100"
                        className="h-10 text-right text-base"
                      />
                    </label>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Desktop: compact table ── */
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="w-8 py-2 pl-1 pr-2 text-left font-medium">#</th>
                <th className="w-[140px] px-2 py-2 text-left font-medium">{t("items.productNumber")}</th>
                <th className="min-w-[220px] px-2 py-2 text-left font-medium">{t("items.description")}</th>
                <th className="w-20 px-2 py-2 text-right font-medium">{t("items.quantity")}</th>
                <th className="w-20 px-2 py-2 text-center font-medium">{t("items.unit")}</th>
                <th className="w-24 px-2 py-2 text-right font-medium">{t("items.pricePerUnit")}</th>
                <th className="w-20 px-2 py-2 text-right font-medium">{t("items.vatRate")}</th>
                <th className="w-20 px-2 py-2 text-right font-medium">{t("items.discount")}</th>
                <th className="w-24 px-2 py-2 text-right font-medium">{t("items.lineTotal")}</th>
                <th className="w-8 py-2 pl-2 pr-1" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const item = items[index];
                const calc = item ? calcItem(item) : null;

                return (
                  <tr key={field.id} className="border-b hover:bg-muted/30">
                    <td className="py-1.5 pl-1 pr-2 text-center align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title={t("items.searchProduct")}
                        onClick={() => openSearch(index)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <PackageSearch className="h-4 w-4" />
                      </Button>
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <Input
                        {...register(`items.${index}.productNumber`)}
                        placeholder={t("items.productNumber")}
                        className="h-8 w-[130px] font-mono text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <Input
                        {...register(`items.${index}.description`)}
                        placeholder={`${t("items.description")} *`}
                        className={cn("h-8", descError(index) && "border-destructive focus-visible:ring-destructive")}
                      />
                      {descError(index) && errors.items?.[index]?.description?.message && (
                        <p className="mt-0.5 text-xs text-destructive">{errors.items[index]!.description!.message}</p>
                      )}
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <Input
                        {...register(`items.${index}.quantity`)}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        className={cn("h-8 w-20 text-right", qtyError(index) && "border-destructive focus-visible:ring-destructive")}
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <select {...register(`items.${index}.unit`)} className={cn(selectCls, "h-8")}>
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{tUnits(u)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <Input
                        {...register(`items.${index}.pricePerUnit`)}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        className="h-8 w-24 text-right"
                      />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <select {...register(`items.${index}.vatRate`)} className={cn(selectCls, "h-8")}>
                        {VAT_PRESETS.map((v) => (
                          <option key={v} value={v}>{v}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <Input
                        {...register(`items.${index}.discount`)}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min="0"
                        max="100"
                        className="h-8 w-20 text-right"
                      />
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right align-middle font-medium">
                      {calc ? formatCurrency(calc.lineTotal, currency) : "—"}
                    </td>
                    <td className="py-1.5 pl-2 pr-1 align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title={tc("delete")}
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

      <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            type="button"
            className="col-span-2 h-11 sm:h-8"
            size="sm"
            onClick={() => openSearch(null)}
          >
            <Search className="mr-1.5 h-4 w-4" />
            {t("items.addPart")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-10 sm:h-8" onClick={addEmptyItem}>
            <PenLine className="mr-1.5 h-4 w-4" />
            {t("items.addManual")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 sm:h-8"
            onClick={() => setPricelistOpen(true)}
          >
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
        keepOpen={searchRowIndex === null}
        onClose={() => {
          setSearchOpen(false);
          setSearchRowIndex(null);
        }}
        onSelect={handleProductSelect}
      />

      <PricelistPickerDialog
        open={pricelistOpen}
        onClose={() => setPricelistOpen(false)}
        onAdd={(product, quantity) => appendProduct(product, quantity)}
      />
    </div>
  );
}
