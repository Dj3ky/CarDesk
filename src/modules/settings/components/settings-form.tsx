"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  settingsSchema,
  type SettingsFormValues,
  CURRENCIES,
  LANGUAGES,
  SETTINGS_VAT_PRESETS,
} from "../schemas/settings.schema";
import { updateSettings } from "../actions/update-settings";
import type { SettingsData } from "../types";

interface SettingsFormProps {
  settings: SettingsData;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [saveState, setSaveState] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: settings.companyName,
      companyVAT: settings.companyVAT ?? "",
      companyAddress: settings.companyAddress ?? "",
      companyEmail: settings.companyEmail ?? "",
      companyPhone: settings.companyPhone ?? "",
      companyLogo: settings.companyLogo ?? "",
      defaultVATRate: parseFloat(settings.defaultVATRate),
      defaultLanguage: settings.defaultLanguage as "en" | "sl",
      currency: settings.currency as "EUR" | "USD" | "GBP" | "CHF",
      offerPrefix: settings.offerPrefix,
      invoicePrefix: settings.invoicePrefix,
      pdfFooterText: settings.pdfFooterText ?? "",
      termsAndConditions: settings.termsAndConditions ?? "",
    },
  });

  async function onSubmit(values: SettingsFormValues) {
    setSaveState("idle");
    setErrorMsg(null);
    const result = await updateSettings(values);
    if (result.success) {
      setSaveState("success");
      if (values.defaultLanguage !== locale) {
        // Redirect to the same page in the newly selected locale
        router.push(`/${values.defaultLanguage}/settings`);
      } else {
        setTimeout(() => setSaveState("idle"), 3000);
      }
    } else {
      setSaveState("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("settings.sections.company")}
            </CardTitle>
            <CardDescription>{t("settings.sections.companyDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t("settings.fields.companyName")}</FormLabel>
                  <FormControl>
                    <Input placeholder="CarDesk d.o.o." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyVAT"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.fields.companyVAT")}</FormLabel>
                  <FormControl>
                    <Input placeholder="SI12345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.fields.companyEmail")}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="info@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.fields.companyPhone")}</FormLabel>
                  <FormControl>
                    <Input placeholder="+386 1 234 5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyLogo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.fields.companyLogo")}</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("settings.fields.companyLogoHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyAddress"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t("settings.fields.companyAddress")}</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Ulica 1, 1000 Ljubljana"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Finance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("settings.sections.finance")}
            </CardTitle>
            <CardDescription>{t("settings.sections.financeDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="defaultVATRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.fields.defaultVATRate")}</FormLabel>
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
                      {SETTINGS_VAT_PRESETS.map((v) => (
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
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.fields.currency")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`settings.currencies.${c}`)}
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

        {/* Document Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("settings.sections.documents")}
            </CardTitle>
            <CardDescription>
              {t("settings.sections.documentsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="offerPrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.fields.offerPrefix")}</FormLabel>
                  <FormControl>
                    <Input
                      className="font-mono uppercase"
                      maxLength={10}
                      placeholder="OFF"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("settings.fields.offerPrefixHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="invoicePrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.fields.invoicePrefix")}</FormLabel>
                  <FormControl>
                    <Input
                      className="font-mono uppercase"
                      maxLength={10}
                      placeholder="INV"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("settings.fields.invoicePrefixHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* PDF & Legal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("settings.sections.pdf")}</CardTitle>
            <CardDescription>{t("settings.sections.pdfDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="pdfFooterText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.fields.pdfFooterText")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("settings.fields.pdfFooterTextHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <FormField
              control={form.control}
              name="termsAndConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.fields.termsAndConditions")}</FormLabel>
                  <FormControl>
                    <Textarea rows={6} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("settings.fields.termsAndConditionsHint")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("settings.sections.system")}
            </CardTitle>
            <CardDescription>{t("settings.sections.systemDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="defaultLanguage"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>{t("settings.fields.defaultLanguage")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l} value={l}>
                          {t(`settings.languages.${l}`)}
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

        {/* Feedback */}
        {saveState === "success" && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {t("settings.saveSuccess")}
          </div>
        )}
        {saveState === "error" && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg ?? t("settings.saveError")}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {form.formState.isSubmitting
              ? t("settings.saving")
              : t("settings.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
