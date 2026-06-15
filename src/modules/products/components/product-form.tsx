"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { productSchema, type ProductFormValues, VAT_PRESETS, UNITS } from "../schemas/product.schema";
import { createProduct } from "../actions/create-product";
import { updateProduct } from "../actions/update-product";
import type { ProductDetail } from "../types";

interface ProductFormProps {
  product?: ProductDetail;
}

export function ProductForm({ product }: ProductFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!product;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      productNumber: product?.productNumber ?? "",
      barcode: product?.barcode ?? "",
      description: product?.description ?? "",
      brand: product?.brand ?? "",
      supplier: product?.supplier ?? "",
      substitutionPart: product?.substitutionPart ?? "",
      price: product ? parseFloat(product.price) : (0 as unknown as number),
      vatRate: product ? parseFloat(product.vatRate) : 22,
      stock: product?.stock ?? 0,
      unit: product?.unit ?? "pcs",
      isActive: product?.isActive ?? true,
      notes: product?.notes ?? "",
    },
  });

  async function onSubmit(values: ProductFormValues) {
    setServerError(null);
    const result = isEdit
      ? await updateProduct(product!.id, values)
      : await createProduct(values);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    toast.success(isEdit ? t("products.updated") : t("products.created"));
    router.push(`/${locale}/products`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {/* Identification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("products.sections.identification")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="productNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("products.fields.productNumber")} *</FormLabel>
                  <FormControl>
                    <Input className="font-mono" placeholder="ART-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("products.fields.barcode")}</FormLabel>
                  <FormControl>
                    <Input className="font-mono" placeholder="5901234123457" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t("products.fields.description")} *</FormLabel>
                  <FormControl>
                    <Input placeholder="Oil filter, 3/4-16 UNF" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("products.fields.brand")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Bosch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("products.fields.supplier")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto Parts d.o.o." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="substitutionPart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("products.fields.substitutionPart")}</FormLabel>
                  <FormControl>
                    <Input className="font-mono" placeholder="ART-002" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("products.sections.pricing")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("products.fields.priceExVat")} (€) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      className="tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vatRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("products.fields.vatRate")} (%)</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(parseFloat(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VAT_PRESETS.map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          {v}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Calculated incl. VAT — read-only display */}
            <div className="space-y-2">
              <FormLabel className="text-muted-foreground">{t("products.fields.priceIncVat")} (€)</FormLabel>
              <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm tabular-nums text-muted-foreground">
                {((form.watch("price") || 0) * (1 + (form.watch("vatRate") || 0) / 100)).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">{t("products.fields.priceIncVatHint")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stock */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("products.sections.stock")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("products.fields.stock")}</FormLabel>
                  <FormControl>
                    <Input type="number" className="tabular-nums" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("products.fields.unit")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {t(`products.units.${u}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Notes & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("products.sections.notes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("products.fields.notes")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div>
                    <FormLabel className="cursor-pointer">{t("products.fields.isActive")}</FormLabel>
                    <FormDescription>{t("products.fields.isActiveHint")}</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? t("common.save") : t("products.create")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
