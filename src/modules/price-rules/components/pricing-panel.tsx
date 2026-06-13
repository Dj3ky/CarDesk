"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { priceRuleSchema, type PriceRuleFormValues } from "../schemas/price-rule.schema";
import { createPriceRule } from "../actions/create-price-rule";
import { togglePriceRule } from "../actions/toggle-price-rule";
import { deletePriceRule } from "../actions/delete-price-rule";
import type { PriceRule } from "../types";

interface PricingPanelProps {
  initialRules: PriceRule[];
}

export function PricingPanel({ initialRules }: PricingPanelProps) {
  const t = useTranslations("settings.pricing");
  const [rules, setRules] = useState<PriceRule[]>(initialRules);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<PriceRuleFormValues>({
    resolver: zodResolver(priceRuleSchema),
    defaultValues: {
      filterType: "brand",
      filterValue: "",
      adjustmentType: "percent",
      adjustmentValue: 0,
    },
  });

  async function onSubmit(values: PriceRuleFormValues) {
    const result = await createPriceRule(values);
    if (result.success) {
      // Optimistic: add a placeholder; page revalidation will sync
      const newRule: PriceRule = {
        id: crypto.randomUUID(),
        filterType: values.filterType,
        filterValue: values.filterValue,
        adjustmentType: values.adjustmentType,
        adjustmentValue: String(values.adjustmentValue),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setRules((prev) => [newRule, ...prev]);
      form.reset();
      setShowForm(false);
    }
  }

  function handleToggle(id: string, current: boolean) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !current } : r))
    );
    startTransition(async () => {
      await togglePriceRule(id, !current);
    });
  }

  function handleDelete(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    startTransition(async () => {
      await deletePriceRule(id);
    });
  }

  function formatAdjustment(rule: PriceRule) {
    const val = parseFloat(rule.adjustmentValue);
    const sign = val >= 0 ? "+" : "";
    if (rule.adjustmentType === "percent") return `${sign}${val}%`;
    return `${sign}${val}`;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t("title")}</CardTitle>
              <CardDescription className="mt-1">{t("description")}</CardDescription>
            </div>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t("addRule")}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Add rule form */}
          {showForm && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <p className="text-sm font-medium mb-3">{t("newRule")}</p>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <FormField
                      control={form.control}
                      name="filterType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("fields.filterType")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="brand">{t("filterTypes.brand")}</SelectItem>
                              <SelectItem value="supplier">{t("filterTypes.supplier")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="filterValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("fields.filterValue")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("fields.filterValuePlaceholder")} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adjustmentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("fields.adjustmentType")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="percent">{t("adjustmentTypes.percent")}</SelectItem>
                              <SelectItem value="fixed">{t("adjustmentTypes.fixed")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adjustmentValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("fields.adjustmentValue")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="8"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowForm(false); form.reset(); }}
                    >
                      {t("cancel")}
                    </Button>
                    <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                      {t("save")}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {/* Rules table */}
          {rules.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("noRules")}</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.filter")}</TableHead>
                    <TableHead>{t("columns.value")}</TableHead>
                    <TableHead>{t("columns.adjustment")}</TableHead>
                    <TableHead className="w-[80px] text-center">{t("columns.active")}</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id} className={!rule.isActive ? "opacity-50" : ""}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize font-normal">
                          {t(`filterTypes.${rule.filterType}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{rule.filterValue}</TableCell>
                      <TableCell>
                        <span className={parseFloat(rule.adjustmentValue) >= 0 ? "text-emerald-600 font-mono font-medium" : "text-destructive font-mono font-medium"}>
                          {formatAdjustment(rule)}
                          {rule.adjustmentType === "percent" ? "" : " (fixed)"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggle(rule.id, rule.isActive)}
                          disabled={isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(rule.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
