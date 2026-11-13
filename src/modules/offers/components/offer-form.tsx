"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle, UserPlus, Car } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createOfferSchema, type OfferFormValues } from "../schemas/offer.schema";
import { createOffer } from "../actions/create-offer";
import { updateOffer } from "../actions/update-offer";
import { getVehiclesForCustomer } from "../actions/get-vehicles-for-customer";
import { calcTotals, formatCurrency } from "../lib/calculations";
import { LineItemsEditor } from "./line-items-editor";
import { QuickCreateDialog } from "./quick-create-dialog";
import { CustomerPicker } from "./customer-picker";
import type { CustomerOption, OfferDetail, VehicleOption } from "../types";

interface OfferFormProps {
  locale: string;
  customers: CustomerOption[];
  defaultVATRate: number;
  currency: string;
  /** Days from today used to pre-fill "valid until" on new offers (0 = leave empty). */
  offerValidityDays?: number;
  offer?: OfferDetail;
  defaultCustomerId?: string;
}

function toDateInput(d: Date) {
  // Local date in YYYY-MM-DD (toISOString would shift to UTC)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDefaults(
  offer: OfferDetail | undefined,
  defaultCustomerId: string | undefined,
  offerValidityDays: number
): OfferFormValues {
  if (!offer) {
    let validUntil = "";
    if (offerValidityDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + offerValidityDays);
      validUntil = toDateInput(d);
    }
    return { customerId: defaultCustomerId ?? "", vehicleId: "", mileage: "", notes: "", validUntil, hideCatalogNumber: false, items: [] };
  }
  return {
    customerId: offer.customerId,
    vehicleId: offer.vehicleId ?? "",
    mileage: offer.mileage ?? "",
    notes: offer.notes ?? "",
    validUntil: offer.validUntil
      ? new Date(offer.validUntil).toISOString().split("T")[0]
      : "",
    hideCatalogNumber: offer.hideCatalogNumber,
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
  offerValidityDays = 0,
  offer,
  defaultCustomerId,
}: OfferFormProps) {
  const t = useTranslations("offers");
  const tc = useTranslations("common");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [customerList, setCustomerList] = useState<CustomerOption[]>(customers);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickAddVehicleOpen, setQuickAddVehicleOpen] = useState(false);
  const pendingVehicleIdRef = useRef<string | null>(null);
  const [pendingNav, setPendingNav] = useState<string | null>(null); // "__back__" or href
  const [discountPrompt, setDiscountPrompt] = useState<number | null>(null);
  const bypassGuard = useRef(false);

  const schema = useMemo(() => createOfferSchema(tv), [tv]);

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(offer, defaultCustomerId, offerValidityDays),
  });

  const { register, handleSubmit, watch, setValue, getValues, control, formState: { errors, isDirty, isSubmitted } } = form;

  const selectedCustomerId = watch("customerId");
  const selectedVehicleId = watch("vehicleId");
  const watchedItems = watch("items");
  const selectedCustomer = customerList.find((c) => c.id === selectedCustomerId) ?? null;
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;
  const totals = calcTotals(watchedItems ?? []);

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
        // Auto-pick the only car the customer has
        setValue("vehicleId", v.length === 1 ? v[0].id : "");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  // Warn on browser refresh / tab close
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept in-app link clicks (sidebar, nav, etc.)
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      if (bypassGuard.current) return;
      const anchor = (e.target as Element).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
      } catch { return; }
      e.preventDefault();
      e.stopPropagation();
      setPendingNav(href);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty]);

  function handleConfirmLeave() {
    bypassGuard.current = true;
    const target = pendingNav;
    setPendingNav(null);
    if (target === "__back__") router.back();
    else if (target) router.push(target);
  }

  function handleCancel() {
    if (isDirty) { setPendingNav("__back__"); return; }
    router.back();
  }

  /** After the customer changes, offer to apply their default discount to existing items. */
  function maybePromptDiscount(customer: CustomerOption | undefined) {
    if (!customer) return;
    const items = getValues("items") ?? [];
    if (items.length === 0) return;
    const target = customer.defaultDiscount ?? 0;
    if (items.every((i) => Number(i.discount ?? 0) === target)) return;
    setDiscountPrompt(target);
  }

  function applyDiscountToAll(discount: number) {
    const items = getValues("items") ?? [];
    items.forEach((_, i) => setValue(`items.${i}.discount`, discount, { shouldDirty: true }));
    setDiscountPrompt(null);
  }

  function handleCustomerPicked(customerId: string, vehicleId?: string) {
    if (customerId === selectedCustomerId) {
      if (vehicleId) setValue("vehicleId", vehicleId, { shouldDirty: true });
      return;
    }
    pendingVehicleIdRef.current = vehicleId ?? null;
    setValue("customerId", customerId, { shouldDirty: true, shouldValidate: isSubmitted });
    maybePromptDiscount(customerList.find((c) => c.id === customerId));
  }

  function handleQuickCreated(customer: CustomerOption, vehicle: VehicleOption | null) {
    const alreadyInList = customerList.some((c) => c.id === customer.id);
    if (!alreadyInList) {
      setCustomerList((prev) => [{ ...customer, vehicles: vehicle ? [vehicle] : [] }, ...prev]);
    }
    if (vehicle) {
      pendingVehicleIdRef.current = vehicle.id;
      if (alreadyInList) {
        setCustomerList((prev) =>
          prev.map((c) => (c.id === customer.id ? { ...c, vehicles: [...(c.vehicles ?? []), vehicle] } : c))
        );
        setVehicles((prev) => [...prev, vehicle]);
        setValue("vehicleId", vehicle.id, { shouldDirty: true });
        return;
      }
    }
    setValue("customerId", customer.id, { shouldDirty: true, shouldValidate: isSubmitted });
    maybePromptDiscount(customer);
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

      bypassGuard.current = true;
      const id = (result as { data?: { id: string } }).data?.id ?? offer?.id;
      toast.success(offer ? t("form.updated") : t("form.created"));
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
              <CustomerPicker
                id="customerId"
                customers={customerList}
                value={selectedCustomerId}
                invalid={!!errors.customerId}
                onSelect={handleCustomerPicked}
                onQuickCreate={() => setQuickCreateOpen(true)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuickCreateOpen(true)}
                title={t("form.quickCreate")}
                className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
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
                value={selectedVehicleId}
                disabled={!selectedCustomerId}
                className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-base focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 sm:h-9 sm:text-sm"
              >
                <option value="">{t("form.noVehicle")}</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationPlate ? `${v.registrationPlate} — ` : ""}
                    {v.make} {v.model} ({v.year})
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
                className="h-11 w-11 shrink-0 sm:h-9 sm:w-9"
              >
                <Car className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {selectedVehicleId && (
            <div className="space-y-1.5">
              <Label htmlFor="mileage">{t("fields.mileage")}</Label>
              <div className="relative">
                <Input
                  id="mileage"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder={selectedVehicle?.mileage != null ? String(selectedVehicle.mileage) : undefined}
                  {...register("mileage")}
                  className="h-11 pr-10 text-base sm:h-9 sm:text-sm"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                  km
                </span>
              </div>
              {selectedVehicle?.mileage != null && (
                <p className="text-xs text-muted-foreground">
                  {t("form.lastMileage", { km: selectedVehicle.mileage.toLocaleString("sl-SI") })}
                </p>
              )}
              {errors.mileage && (
                <p className="text-xs text-destructive">{errors.mileage.message as string}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="validUntil">{t("fields.validUntil")}</Label>
            <Input id="validUntil" type="date" {...register("validUntil")} className="h-11 text-base sm:h-9 sm:text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("items.title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <LineItemsEditor
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            isSubmitted={isSubmitted}
            defaultVATRate={defaultVATRate}
            defaultDiscount={selectedCustomer?.defaultDiscount ?? 0}
            currency={currency}
          />
          {(() => {
            if (watchedItems?.length > 0) return null;
            const e = errors.items as unknown as { root?: { message?: string }; message?: string } | undefined;
            const msg = e?.root?.message ?? e?.message;
            return msg ? <p className="mt-2 text-xs text-destructive">{msg}</p> : null;
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("fields.notes")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            {...register("notes")}
            placeholder={t("form.notesPlaceholder")}
            rows={3}
            className="text-base sm:text-sm"
          />
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              {...register("hideCatalogNumber")}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-input accent-primary sm:h-4 sm:w-4"
            />
            <span className="space-y-0.5">
              <span className="text-sm font-medium leading-none">
                {t("form.hideCatalogNumber")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("form.hideCatalogNumberHint")}
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Sticky action bar: running total + save, always reachable on phones */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              {t("totals.grandTotal")}
              {watchedItems?.length > 0 && (
                <span className="ml-1">· {t("items.count", { count: watchedItems.length })}</span>
              )}
            </p>
            <p className="truncate text-lg font-semibold tabular-nums">
              {formatCurrency(totals.grandTotal, currency)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
            className="hidden h-11 sm:inline-flex sm:h-9"
          >
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={isPending} className="h-11 px-5 sm:h-9">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {offer ? t("form.saveChanges") : t("form.createOffer")}
          </Button>
        </div>
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

      <AlertDialog open={discountPrompt !== null} onOpenChange={(open) => { if (!open) setDiscountPrompt(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("form.applyDiscountTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("form.applyDiscountDesc", { discount: discountPrompt ?? 0, count: watchedItems?.length ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("form.applyDiscountKeep")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => applyDiscountToAll(discountPrompt ?? 0)}>
              {t("form.applyDiscountApply")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingNav} onOpenChange={(open) => { if (!open) setPendingNav(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("form.unsavedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("form.unsavedDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("form.unsavedStay")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLeave}>
              {t("form.unsavedLeave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
