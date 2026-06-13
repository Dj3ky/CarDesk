"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle, UserPlus, Car } from "lucide-react";
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
import { QuickCreateDialog } from "./quick-create-dialog";
import type { CustomerOption, OfferDetail, VehicleOption } from "../types";

interface OfferFormProps {
  locale: string;
  customers: CustomerOption[];
  defaultVATRate: number;
  currency: string;
  offer?: OfferDetail;
  defaultCustomerId?: string;
}

function buildDefaults(offer: OfferDetail | undefined, defaultCustomerId?: string): OfferFormValues {
  if (!offer) {
    return { customerId: defaultCustomerId ?? "", vehicleId: "", notes: "", validUntil: "", items: [] };
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
  defaultCustomerId,
}: OfferFormProps) {
  const t = useTranslations("offers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customerList, setCustomerList] = useState<CustomerOption[]>(customers);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickAddVehicleOpen, setQuickAddVehicleOpen] = useState(false);
  const pendingVehicleIdRef = useRef<string | null>(null);

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: buildDefaults(offer, defaultCustomerId),
  });

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = form;

  const selectedCustomerId = watch("customerId");
  const selectedCustomer = customerList.find((c) => c.id === selectedCustomerId) ?? null;

  useEffect(() => {
    if (!selectedCustomerId) {
      setVehicles([]);
      return;
    }
    getVehiclesForCustomer(selectedCustomerId).then((v) => {
      setVehicles(v);
      const pending = pendingVehicleIdRef.current;
      pendingVehicleIdRef.current = null;
      if (pending && v.some((x) => x.id === pending)) {
        setValue("vehicleId", pending);
      } else if (!offer || offer.customerId !== selectedCustomerId) {
        setValue("vehicleId", "");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  function handleQuickCreated(customer: CustomerOption, vehicle: VehicleOption | null) {
    const alreadyInList = customerList.some((c) => c.id === customer.id);
    if (!alreadyInList) {
      setCustomerList((prev) => [customer, ...prev]);
    }
    if (vehicle) {
      pendingVehicleIdRef.current = vehicle.id;
      if (alreadyInList) {
        setVehicles((prev) => [...prev, vehicle]);
        setValue("vehicleId", vehicle.id);
        return;
      }
    }
    setValue("customerId", customer.id);
  }

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
            <div className="flex gap-2">
              <select
                id="customerId"
                {...register("customerId")}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t("form.selectCustomer")}</option>
                {customerList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.lastName}, {c.firstName}
                    {c.companyName ? ` (${c.companyName})` : ""}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuickCreateOpen(true)}
                title={t("form.quickCreate")}
                className="shrink-0"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
            {errors.customerId && (
              <p className="text-xs text-destructive">{errors.customerId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vehicleId">{t("fields.vehicle")}</Label>
            <div className="flex gap-2">
              <select
                id="vehicleId"
                {...register("vehicleId")}
                disabled={!selectedCustomerId}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              >
                <option value="">{t("form.noVehicle")}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} ({v.year})
                    {v.registrationPlate ? ` — ${v.registrationPlate}` : ""}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!selectedCustomerId}
                onClick={() => setQuickAddVehicleOpen(true)}
                title={t("form.quickAddVehicle")}
                className="shrink-0"
              >
                <Car className="h-4 w-4" />
              </Button>
            </div>
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

      <QuickCreateDialog
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        onCreated={handleQuickCreated}
      />
      <QuickCreateDialog
        open={quickAddVehicleOpen}
        onClose={() => setQuickAddVehicleOpen(false)}
        onCreated={handleQuickCreated}
        existingCustomer={selectedCustomer ?? undefined}
      />
    </form>
  );
}
