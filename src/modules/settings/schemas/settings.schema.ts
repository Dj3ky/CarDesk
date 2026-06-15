import { z } from "zod";

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF"] as const;
export const LANGUAGES = ["en", "sl"] as const;
export const SETTINGS_VAT_PRESETS = [0, 5, 9.5, 22] as const;

const optStr = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.trim() || undefined);

export const settingsSchema = z.object({
  companyName: z.string().max(200).default("").transform((v) => v.trim()),
  companyVAT: optStr(50),
  companyAddress: optStr(500),
  companyEmail: optStr(200),
  companyPhone: optStr(50),
  companyLogo: optStr(500),
  defaultVATRate: z.coerce
    .number({ invalid_type_error: "VAT must be a number" })
    .min(0)
    .max(100)
    .default(22),
  defaultLanguage: z.enum(LANGUAGES).default("en"),
  currency: z.enum(CURRENCIES).default("EUR"),
  offerPrefix: z
    .string()
    .min(1, "Required")
    .max(10)
    .default("OFF")
    .transform((v) => v.trim()),
  invoicePrefix: z
    .string()
    .min(1, "Required")
    .max(10)
    .default("INV")
    .transform((v) => v.trim()),
  workOrderPrefix: z
    .string()
    .min(1, "Required")
    .max(10)
    .default("WO")
    .transform((v) => v.trim()),
  pdfFooterText: optStr(1000),
  termsAndConditions: optStr(5000),
});

export type SettingsFormValues = z.input<typeof settingsSchema>;
export type SettingsFormParsed = z.output<typeof settingsSchema>;
