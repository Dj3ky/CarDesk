"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle, Upload, X } from "lucide-react";
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
  createSettingsSchema,
  type SettingsFormValues,
  CURRENCIES,
  LANGUAGES,
  SETTINGS_VAT_PRESETS,
} from "../schemas/settings.schema";
import { updateSettings } from "../actions/update-settings";
import type { SettingsData } from "../types";
import type { SettingsTab } from "./settings-nav";

interface SettingsFormProps {
  settings: SettingsData;
  activeTab: SettingsTab;
}

export function SettingsForm({ settings, activeTab }: SettingsFormProps) {
  const t = useTranslations();
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const [saveState, setSaveState] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schema = useMemo(() => createSettingsSchema(tv), [tv]);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(schema),
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
      workOrderPrefix: settings.workOrderPrefix ?? "WO",
      pdfFooterText: settings.pdfFooterText ?? "",
      termsAndConditions: settings.termsAndConditions ?? "",
      partsCatalogApiKey: settings.partsCatalogApiKey ?? "",
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 30,
    },
  });

  const logoUrl = form.watch("companyLogo");

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? t("settings.uploadError"));
      } else {
        form.setValue("companyLogo", data.url, { shouldDirty: true });
      }
    } catch {
      setUploadError(t("settings.uploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onSubmit(values: SettingsFormValues) {
    setSaveState("idle");
    setErrorMsg(null);
    const result = await updateSettings(values);
    if (result.success) {
      setSaveState("success");
      if (values.defaultLanguage !== locale) {
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
        {activeTab === "company" && (
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
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t("settings.fields.companyLogo")}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={handleLogoUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        title={t("settings.fields.companyLogoUpload")}
                      >
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                      {logoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => form.setValue("companyLogo", "", { shouldDirty: true })}
                          title={t("settings.fields.companyLogoClear")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {uploadError && (
                      <p className="text-sm text-destructive">{uploadError}</p>
                    )}
                    {logoUrl && (
                      <div className="mt-2 inline-block rounded border bg-muted p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logoUrl}
                          alt="Logo preview"
                          className="h-12 w-auto object-contain max-w-[180px]"
                        />
                      </div>
                    )}
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
        )}

        {/* Finance Settings */}
        {activeTab === "finance" && (
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
        )}

        {/* Document Settings + PDF & Legal */}
        {activeTab === "documents" && (
          <>
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
                <FormField
                  control={form.control}
                  name="workOrderPrefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("settings.fields.workOrderPrefix")}</FormLabel>
                      <FormControl>
                        <Input
                          className="font-mono uppercase"
                          maxLength={10}
                          placeholder="WO"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("settings.fields.workOrderPrefixHint")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

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
          </>
        )}

        {/* System Settings */}
        {activeTab === "system" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("settings.sections.system")}
              </CardTitle>
              <CardDescription>{t("settings.sections.systemDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <FormField
                control={form.control}
                name="sessionTimeoutMinutes"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>{t("settings.fields.sessionTimeoutMinutes")}</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(parseInt(v, 10))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">{t("settings.sessionTimeout.disabled")}</SelectItem>
                        <SelectItem value="15">{t("settings.sessionTimeout.minutes", { count: 15 })}</SelectItem>
                        <SelectItem value="30">{t("settings.sessionTimeout.minutes", { count: 30 })}</SelectItem>
                        <SelectItem value="60">{t("settings.sessionTimeout.minutes", { count: 60 })}</SelectItem>
                        <SelectItem value="120">{t("settings.sessionTimeout.minutes", { count: 120 })}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("settings.fields.sessionTimeoutHint")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Integrations */}
        {activeTab === "integrations" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("settings.sections.integrations")}
              </CardTitle>
              <CardDescription>{t("settings.sections.integrationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="partsCatalogApiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings.fields.partsCatalogApiKey")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="your-api-key"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("settings.fields.partsCatalogApiKeyHint")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

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
