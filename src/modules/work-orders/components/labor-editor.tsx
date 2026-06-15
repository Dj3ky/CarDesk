"use client";

import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { PlusCircle, Trash2 } from "lucide-react";
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
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "laborItems" });
  const { register, watch, setValue, formState: { errors } } = form;

  const laborItems = watch("laborItems");

  function addLaborLine() {
    append({ description: "", hours: 1, hourlyRate: 0, vatRate: defaultVATRate });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">Labor</h3>
        <Button type="button" variant="outline" size="sm" onClick={addLaborLine}>
          <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
          Add Labor
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No labor lines added yet.</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => {
            const item = laborItems?.[index];
            const { lineTotal } = calcLaborItem(item ?? {});
            const errs = errors.laborItems?.[index];

            return (
              <div key={field.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Description (e.g. Oil change, Brake service)"
                      {...register(`laborItems.${index}.description`)}
                      className={errs?.description ? "border-destructive" : ""}
                    />
                    {errs?.description && (
                      <p className="text-xs text-destructive mt-0.5">{errs.description.message}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Hours</label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="0.00"
                      {...register(`laborItems.${index}.hours`)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Rate / hr</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register(`laborItems.${index}.hourlyRate`)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">VAT %</label>
                    <select
                      {...register(`laborItems.${index}.vatRate`)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {VAT_PRESETS.map((v) => (
                        <option key={v} value={v}>{v}%</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(lineTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
