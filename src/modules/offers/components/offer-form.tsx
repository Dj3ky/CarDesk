"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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

function buildDefaults(
  offer: OfferDetail | undefined,
  defaultVATRate: number
): OfferFormValues {
  if (!offer) {
    return {
      customerId: "",
      vehicleId: "",
      notes: "",
      validUntil: "",
      items: [],
    };
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: buildDefaults(offer, defaultVATRate),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;

  const selectedCustomerId = watch("customerId");

  useEffect(() => {
    if (!selectedCustomerId) {
      setVehicles([]);
      return;
    }
    getVehiclesForCustomer(selectedCustomerId).then((v) => {
      setVehicles(v);
      // Reset vehicle selection only when customer changes (not on initial load)
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
      {/* Header info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Offer Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Customer */}
          <div className="space-y-1.5">
            <Label htmlFor="customerId">
              Customer <span className="text-destructive">*</span>
            </Label>
            <select
              id="customerId"
              {...register("customerId")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— Select customer —</option>
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

          {/* Vehicle */}
          <div className="space-y-1.5">
            <Label htmlFor="vehicleId">Vehicle</Label>
            <select
              id="vehicleId"
              {...register("vehicleId")}
              disabled={!selectedCustomerId}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">— None —</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.year})
                  {v.registrationPlate ? ` — ${v.registrationPlate}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Valid Until */}
          <div className="space-y-1.5">
            <Label htmlFor="validUntil">Valid Until</Label>
            <Input
              id="validUntil"
              type="date"
              {...register("validUntil")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <LineItemsEditor
            control={control}
            register={register}
            setValue={setValue}
            defaultVATRate={defaultVATRate}
            currency={currency}
          />
          {errors.items?.root && (
            <p className="mt-2 text-xs text-destructive">{errors.items.root.message}</p>
          )}
          {typeof errors.items?.message === "string" && (
            <p className="mt-2 text-xs text-destructive">{errors.items.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("notes")}
            placeholder="Internal notes or instructions for the customer…"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {offer ? "Save Changes" : "Create Offer"}
        </Button>
      </div>
    </form>
  );
}
