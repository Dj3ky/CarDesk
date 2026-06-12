"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { offerSchema, type OfferFormValues } from "../schemas/offer.schema";
import { createOffer } from "../actions/create-offer";
import { updateOffer } from "../actions/update-offer";
import { getVehiclesForCustomer } from "../actions/get-vehicles-for-customer";
import { LineItemsEditor } from "./line-items-editor";
import type { CustomerOption, OfferDetail, VehicleOption } from "../types";

interface OfferFormProps {
  locale: string;
  customers: CustomerOption[];
  defaultVATRate: number;
  currency: string;
  offer?: OfferDetail;
}

function buildDefaults(offer: OfferDetail | undefined): OfferFormValues {
  if (!offer) {
    return { customerId: "", vehicleId: "", notes: "", validUntil: "", items: [] };
  }
  return {
    customerId: offer.customerId,
    vehicleId: offer.vehicleId ?? "",
    notes: offer.notes ?? "",
    validUntil: offer.validUntil
      ? new Date(offer.validUntil).toISOString().split("T")[0]
      : "",
    items: offer.items.map((item) => ({
      id: item.id,
      productId: item.productId ?? "",
      productNumber: item.productNumber ?? "",
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit: item.unit,
      pricePerUnit: parseFloat(item.pricePerUnit),
      vatRate: parseFloat(item.vatRate),
      discount: parseFloat(item.discount),
    })),
  };
}

export function OfferForm({
  locale,
  customers,
  defaultVATRate,
  currency,
  offer,
}: OfferFormProps) {
  const t = useTranslations("offers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: buildDefaults(offer),
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = form;

  const selectedCustomerId = watch("customerId");

  useEffect(() => {
    if (!selectedCustomerId) {
      setVehicles([]);
      return;
    }
    getVehiclesForCustomer(selectedCustomerId).then((v) => {
      setVehicles(v);
      if (!offer || offer.customerId !== selectedCustomerId) {
        setValue("vehicleId", "");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  function onSubmit(values: OfferFormValues) {
    startTransition(async () => {
      setError(null);
      const result = offer
        ? await updateOffer(offer.id, values)
        : await createOffer(values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const id = (result as { data?: { id: string } }).data?.id ?? offer?.id;
      router.push(`/${locale}/offers/${id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="customerId">
              {t("fields.customer")} <span className="text-destructive">*</span>
            </Label>
            <select
              id="customerId"
              {...register("customerId")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("form.selectCustomer")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.lastName}, {c.firstName}
                  {c.companyName ? ` (${c.companyName})` : ""}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="text-xs text-destructive">{errors.customerId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vehicleId">{t("fields.vehicle")}</Label>
            <select
              id="vehicleId"
              {...register("vehicleId")}
              disabled={!selectedCustomerId}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{t("form.noVehicle")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.year})
                  {v.registrationPlate ? ` — ${v.registrationPlate}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="validUntil">{t("fields.validUntil")}</Label>
            <Input id="validUntil" type="date" {...register("validUntil")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("items.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemsEditor
            control={control}
            register={register}
            setValue={setValue}
            defaultVATRate={defaultVATRate}
            currency={currency}
          />
          {typeof errors.items?.message === "string" && (
            <p className="mt-2 text-xs text-destructive">{errors.items.message}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("fields.notes")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("notes")}
            placeholder={t("form.notesPlaceholder")}
            rows={3}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {offer ? t("form.saveChanges") : t("form.createOffer")}
        </Button>
      </div>
    </form>
  );
}
