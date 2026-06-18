"use client";

import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, calcLaborItem } from "../lib/calculations";
import type { WorkOrderFormValues } from "../schemas/work-order.schema";

const VAT_PRESETS = [0, 9.5, 22];

interface LaborEditorProps {
  form: UseFormReturn<WorkOrderFormValues>;
  currency?: string;
  defaultVATRate?: number;
}

export function LaborEditor({ form, currency = "EUR", defaultVATRate = 22 }: LaborEditorProps) {
  const t = useTranslations("workOrders");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "laborItems" });
  const { register, watch, formState: { errors } } = form;

  const laborItems = watch("laborItems") ?? [];

  function addLaborLine() {
    append({ description: "", hours: 1, hourlyRate: 0, vatRate: defaultVATRate });
  }

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          {t("labor.noLabor")}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="py-2 px-2 text-left font-medium min-w-[200px]">{t("parts.description")}</th>
                <th className="py-2 px-2 text-right font-medium w-24">{t("labor.hours")}</th>
                <th className="py-2 px-2 text-right font-medium w-28">{t("labor.ratePerHour")}</th>
                <th className="py-2 px-2 text-right font-medium w-20">{t("parts.vatRate")}</th>
                <th className="py-2 px-2 text-right font-medium w-24">{t("detail.total")}</th>
                <th className="py-2 pl-2 pr-1 w-8" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const item = laborItems[index];
                const calc = item ? calcLaborItem(item) : null;
                const errs = errors.laborItems?.[index];

                return (
                  <tr key={field.id} className="border-b hover:bg-muted/30">
                    <td className="py-1.5 px-2 align-top">
                      <Input
                        placeholder={t("form.laborDescriptionPlaceholder")}
                        {...register(`laborItems.${index}.description`)}
                        className={`h-8 ${errs?.description ? "border-destructive" : ""}`}
                      />
                      {errs?.description && (
                        <p className="text-xs text-destructive mt-0.5">{errs.description.message}</p>
                      )}
                    </td>
                    <td className="py-1.5 px-2 align-top">
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        placeholder="0.00"
                        title={errs?.hours?.message}
                        className={`h-8 text-right w-24${errs?.hours ? " border-destructive focus-visible:ring-destructive" : ""}`}
                        {...register(`laborItems.${index}.hours`)}
                      />
                    </td>
                    <td className="py-1.5 px-2 align-top">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="h-8 text-right w-28"
                        {...register(`laborItems.${index}.hourlyRate`)}
                      />
                    </td>
                    <td className="py-1.5 px-2 align-top">
                      <select
                        {...register(`laborItems.${index}.vatRate`)}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {VAT_PRESETS.map((v) => (
                          <option key={v} value={v}>{v}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-right font-medium align-top whitespace-nowrap">
                      {calc ? formatCurrency(calc.lineTotal, currency) : "—"}
                    </td>
                    <td className="py-1.5 pl-2 pr-1 align-top">
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

      <div className="pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addLaborLine}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("labor.addLabor")}
        </Button>
      </div>
    </div>
  );
}
