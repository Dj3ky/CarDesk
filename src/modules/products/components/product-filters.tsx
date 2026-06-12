"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import type { FilterOptions } from "../types";

interface ProductFiltersProps {
  options: FilterOptions;
  current: {
    brand?: string;
    supplier?: string;
    minPrice?: string;
    maxPrice?: string;
  };
}

const ALL_VALUE = "__all__";

export function ProductFilters({ options, current }: ProductFiltersProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(
    !!(current.brand || current.supplier || current.minPrice || current.maxPrice)
  );

  const [minPrice, setMinPrice] = useState(current.minPrice ?? "");
  const [maxPrice, setMaxPrice] = useState(current.maxPrice ?? "");

  const applyFilters = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      for (const [k, v] of Object.entries(overrides)) {
        if (v && v !== ALL_VALUE) {
          params.set(k, v);
        } else {
          params.delete(k);
        }
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    ["brand", "supplier", "minPrice", "maxPrice"].forEach((k) => params.delete(k));
    params.delete("page");
    setMinPrice("");
    setMaxPrice("");
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const hasActiveFilters = !!(current.brand || current.supplier || current.minPrice || current.maxPrice);

  return (
    <div className="rounded-lg border">
      {/* Toggle row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span>{t("common.filter")}</span>
          {hasActiveFilters && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
              {[current.brand, current.supplier, current.minPrice, current.maxPrice].filter(Boolean).length}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Filter panel */}
      {open && (
        <div className="border-t px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("products.fields.brand")}</Label>
              <Select
                value={current.brand ?? ALL_VALUE}
                onValueChange={(v) => applyFilters({ brand: v })}
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder={t("common.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>{t("common.all")}</SelectItem>
                  {options.brands.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("products.fields.supplier")}</Label>
              <Select
                value={current.supplier ?? ALL_VALUE}
                onValueChange={(v) => applyFilters({ supplier: v })}
              >
                <SelectTrigger size="sm">
                  <SelectValue placeholder={t("common.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>{t("common.all")}</SelectItem>
                  {options.suppliers.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price range */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("products.filters.minPrice")}</Label>
              <Input
                type="number"
                size={1}
                min={0}
                step={0.01}
                placeholder="0.00"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                onBlur={() => applyFilters({ minPrice: minPrice || undefined })}
                className="h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("products.filters.maxPrice")}</Label>
              <Input
                type="number"
                size={1}
                min={0}
                step={0.01}
                placeholder="9999.99"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                onBlur={() => applyFilters({ maxPrice: maxPrice || undefined })}
                className="h-8"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearAll}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                {t("common.clearFilters")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
