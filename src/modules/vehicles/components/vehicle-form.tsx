"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { FuelType } from "@prisma/client";
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
import { createVehicleSchema, type VehicleFormValues } from "../schemas/vehicle.schema";
import { createVehicle } from "../actions/create-vehicle";
import { updateVehicle } from "../actions/update-vehicle";
import type { Vehicle } from "@prisma/client";

const FUEL_TYPES = Object.values(FuelType);

interface VehicleFormProps {
  customerId: string;
  vehicle?: Vehicle;
}

export function VehicleForm({ customerId, vehicle }: VehicleFormProps) {
  const t = useTranslations();
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!vehicle;

  const schema = useMemo(() => createVehicleSchema(tv), [tv]);

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      make: vehicle?.make ?? "",
      model: vehicle?.model ?? "",
      year: vehicle?.year ?? new Date().getFullYear(),
      vin: vehicle?.vin ?? "",
      registrationPlate: vehicle?.registrationPlate ?? "",
      fuelType: vehicle?.fuelType ?? FuelType.PETROL,
      mileage: vehicle?.mileage ?? ("" as unknown as number),
      color: vehicle?.color ?? "",
      notes: vehicle?.notes ?? "",
      isActive: vehicle?.isActive ?? true,
    },
  });

  async function onSubmit(values: VehicleFormValues) {
    setServerError(null);
    const result = isEdit
      ? await updateVehicle(vehicle!.id, values)
      : await createVehicle(customerId, values);

    if (!result.success) {
      setServerError(result.error);
      return;
    }

    const vehicleId = result.data?.id ?? vehicle?.id;
    router.push(`/${locale}/customers/${customerId}/vehicles/${vehicleId}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {/* Vehicle Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("vehicles.sections.identity")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="make"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vehicles.fields.make")} *</FormLabel>
                  <FormControl>
                    <Input placeholder="Toyota" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vehicles.fields.model")} *</FormLabel>
                  <FormControl>
                    <Input placeholder="Corolla" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vehicles.fields.year")} *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1900}
                      max={new Date().getFullYear() + 1}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vehicles.fields.fuelType")} *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FUEL_TYPES.map((ft) => (
                        <SelectItem key={ft} value={ft}>
                          {t(`vehicles.fuelTypes.${ft.toLowerCase() as Lowercase<typeof ft>}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vehicles.fields.color")}</FormLabel>
                  <FormControl>
                    <Input placeholder="White" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mileage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vehicles.fields.mileage")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>{t("vehicles.fields.mileageUnit")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Registration & VIN */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("vehicles.sections.registration")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="registrationPlate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vehicles.fields.registrationPlate")}</FormLabel>
                  <FormControl>
                    <Input placeholder="LJ AB-123" className="uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vehicles.fields.vin")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1HGBH41JXMN109186"
                      className="uppercase font-mono tracking-wide"
                      maxLength={17}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t("vehicles.fields.vinHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Notes & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("vehicles.sections.notes")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("vehicles.fields.notes")}</FormLabel>
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
                    <FormLabel className="cursor-pointer">{t("vehicles.fields.isActive")}</FormLabel>
                    <FormDescription>{t("vehicles.fields.isActiveHint")}</FormDescription>
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
            {isEdit ? t("common.save") : t("vehicles.create")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
