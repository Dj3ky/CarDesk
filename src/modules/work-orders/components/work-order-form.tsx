"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, AlertCircle, UserPlus, Car } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { workOrderSchema } from "../schemas/work-order.schema";
import { createWorkOrder } from "../actions/create-work-order";
import { updateWorkOrder } from "../actions/update-work-order";
import { getVehiclesForWorkOrder } from "../actions/get-form-data";
import { PartsEditor } from "./parts-editor";
import { LaborEditor } from "./labor-editor";
import { calcTotals, formatCurrency } from "../lib/calculations";
import type { WorkOrderFormValues } from "../schemas/work-order.schema";
import type { WorkOrderDetail, WorkOrderItemData, LaborItemData } from "../types";
import type { CustomerOption, VehicleOption, TechnicianOption } from "../actions/get-form-data";

interface WorkOrderFormProps {
  workOrder?: WorkOrderDetail;
  customers: CustomerOption[];
  technicians: TechnicianOption[];
  defaultVATRate?: number;
  currency?: string;
  defaultCustomerId?: string;
}

function buildDefaults(wo?: WorkOrderDetail, defaultCustomerId?: string): WorkOrderFormValues {
  if (!wo) {
    return {
      customerId: defaultCustomerId ?? "",
      vehicleId: "",
      technicianId: "",
      offerId: "",
      reportedProblem: "",
      internalNotes: "",
      mileageIn: undefined,
      mileageOut: undefined,
      scheduledAt: "",
      items: [],
      laborItems: [],
    };
  }
  return {
    customerId: wo.customerId,
    vehicleId: wo.vehicleId ?? "",
    technicianId: wo.technicianId ?? "",
    offerId: wo.offerId ?? "",
    reportedProblem: wo.reportedProblem ?? "",
    internalNotes: wo.internalNotes ?? "",
    mileageIn: wo.mileageIn ?? undefined,
    mileageOut: wo.mileageOut ?? undefined,
    scheduledAt: wo.scheduledAt ? wo.scheduledAt.toISOString().split("T")[0] : "",
    items: wo.items.map((item: WorkOrderItemData) => ({
      id: item.id,
      productId: item.productId ?? undefined,
      productNumber: item.productNumber ?? undefined,
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit: item.unit,
      pricePerUnit: parseFloat(item.pricePerUnit),
      vatRate: parseFloat(item.vatRate),
      discount: parseFloat(item.discount),
    })),
    laborItems: wo.laborItems.map((labor: LaborItemData) => ({
      id: labor.id,
      description: labor.description,
      hours: parseFloat(labor.hours),
      hourlyRate: parseFloat(labor.hourlyRate),
      vatRate: parseFloat(labor.vatRate),
    })),
  };
}

export function WorkOrderForm({
  workOrder,
  customers,
  technicians,
  defaultVATRate = 22,
  currency = "EUR",
  defaultCustomerId,
}: WorkOrderFormProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("workOrders");
  const tc = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const isEdit = !!workOrder;

  const form = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: buildDefaults(workOrder, defaultCustomerId),
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const customerId = watch("customerId");
  const vehicleId = watch("vehicleId");
  const items = watch("items") ?? [];
  const laborItems = watch("laborItems") ?? [];
  const totals = calcTotals(items, laborItems);

  useEffect(() => {
    if (!customerId) { setVehicles([]); return; }
    getVehiclesForWorkOrder(customerId).then((v) => {
      setVehicles(v);
      if (!workOrder || workOrder.customerId !== customerId) {
        setValue("vehicleId", "");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  function onSubmit(values: WorkOrderFormValues) {
    startTransition(async () => {
      setError(null);
      const result = isEdit
        ? await updateWorkOrder(workOrder.id, values)
        : await createWorkOrder(values);

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast.success(isEdit ? t("updated") : t("created"));
      if (!isEdit && result.data?.id) {
        router.push(`/${locale}/work-orders/${result.data.id}`);
      } else {
        router.push(`/${locale}/work-orders`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Customer */}
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
                  {c.companyName ?? `${c.firstName} ${c.lastName}`}
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="text-xs text-destructive">{errors.customerId.message}</p>
            )}
          </div>

          {/* Vehicle */}
          <div className="space-y-1.5">
            <Label htmlFor="vehicleId">{t("fields.vehicle")}</Label>
            <select
              id="vehicleId"
              {...register("vehicleId")}
              disabled={!customerId}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{t("form.noVehicle")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.year}){v.registrationPlate ? ` — ${v.registrationPlate}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Technician */}
          <div className="space-y-1.5">
            <Label htmlFor="technicianId">{t("fields.technician")}</Label>
            <select
              id="technicianId"
              {...register("technicianId")}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">{t("form.unassigned")}</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>{tech.name ?? tech.email}</option>
              ))}
            </select>
          </div>

          {/* Scheduled date */}
          <div className="space-y-1.5">
            <Label htmlFor="scheduledAt">{t("fields.scheduledAt")}</Label>
            <Input id="scheduledAt" type="date" {...register("scheduledAt")} />
          </div>

          {/* Mileage in */}
          {vehicleId && (
            <div className="space-y-1.5">
              <Label htmlFor="mileageIn">{t("fields.mileageIn")}</Label>
              <div className="relative">
                <Input id="mileageIn" type="number" min="0" placeholder="0" className="pr-10" {...register("mileageIn")} />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">km</span>
              </div>
            </div>
          )}

          {/* Mileage out - only on edit */}
          {isEdit && vehicleId && (
            <div className="space-y-1.5">
              <Label htmlFor="mileageOut">{t("fields.mileageOut")}</Label>
              <div className="relative">
                <Input id="mileageOut" type="number" min="0" placeholder="0" className="pr-10" {...register("mileageOut")} />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">km</span>
              </div>
            </div>
          )}

          {/* Reported problem */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="reportedProblem">{t("fields.reportedProblem")}</Label>
            <Textarea
              id="reportedProblem"
              rows={3}
              placeholder={t("form.reportedProblemPlaceholder")}
              {...register("reportedProblem")}
            />
          </div>

          {/* Internal notes */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="internalNotes">{t("fields.internalNotes")}</Label>
            <Textarea
              id="internalNotes"
              rows={2}
              placeholder={t("form.internalNotesPlaceholder")}
              {...register("internalNotes")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Parts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("parts.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PartsEditor form={form} currency={currency} defaultVATRate={defaultVATRate} />
        </CardContent>
      </Card>

      {/* Labor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("labor.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LaborEditor form={form} currency={currency} defaultVATRate={defaultVATRate} />
        </CardContent>
      </Card>

      {/* Totals */}
      {(items.length > 0 || laborItems.length > 0) && (
        <div className="flex justify-end">
          <div className="space-y-1 text-sm min-w-[220px]">
            {totals.partsSubtotalExVat > 0 && (
              <div className="flex justify-between gap-8 text-muted-foreground">
                <span>{t("totals.partsExVat")}</span>
                <span className="font-medium text-foreground">{formatCurrency(totals.partsSubtotalExVat, currency)}</span>
              </div>
            )}
            {totals.laborSubtotalExVat > 0 && (
              <div className="flex justify-between gap-8 text-muted-foreground">
                <span>{t("totals.laborExVat")}</span>
                <span className="font-medium text-foreground">{formatCurrency(totals.laborSubtotalExVat, currency)}</span>
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
        </div>
      )}

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
          {isEdit ? t("actions.saveChanges") : t("actions.createWorkOrder")}
        </Button>
      </div>
    </form>
  );
}
