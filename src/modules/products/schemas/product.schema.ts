import { z } from "zod";

export const VAT_PRESETS = [0, 5, 9.5, 22] as const;

export const UNITS = ["pcs", "m", "kg", "l", "set", "pair"] as const;
export type Unit = (typeof UNITS)[number];

type TFn = (key: string) => string;

function productSchemaWith(t: TFn) {
  return z.object({
    productNumber: z
      .string()
      .min(1, t("productNumberRequired"))
      .max(100)
      .transform((v) => v.trim()),
    barcode: z
      .string()
      .max(100)
      .optional()
      .or(z.literal(""))
      .transform((v) => v?.trim() || undefined),
    description: z
      .string()
      .min(1, t("descriptionRequired"))
      .max(500)
      .transform((v) => v.trim()),
    brand: z
      .string()
      .max(100)
      .optional()
      .or(z.literal(""))
      .transform((v) => v?.trim() || undefined),
    supplier: z
      .string()
      .max(100)
      .optional()
      .or(z.literal(""))
      .transform((v) => v?.trim() || undefined),
    price: z.coerce
      .number({ invalid_type_error: t("mustBeNumber") })
      .min(0, t("cannotBeNegative"))
      .multipleOf(0.01),
    vatRate: z.coerce
      .number({ invalid_type_error: t("mustBeNumber") })
      .min(0)
      .max(100),
    stock: z.coerce
      .number({ invalid_type_error: t("mustBeNumber") })
      .int()
      .default(0),
    unit: z.string().default("pcs"),
    isActive: z.boolean().default(true),
    substitutionPart: z
      .string()
      .max(100)
      .optional()
      .or(z.literal(""))
      .transform((v) => v?.trim() || undefined),
    notes: z
      .string()
      .max(2000)
      .optional()
      .or(z.literal(""))
      .transform((v) => v?.trim() || undefined),
  });
}

const englishT: TFn = (key) => {
  const m: Record<string, string> = {
    productNumberRequired: "Product number is required",
    descriptionRequired: "Description is required",
    mustBeNumber: "Must be a number",
    cannotBeNegative: "Cannot be negative",
  };
  return m[key] ?? key;
};

export const productSchema = productSchemaWith(englishT);

export function createProductSchema(t: TFn) {
  return productSchemaWith(t);
}

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductFormParsed = z.output<typeof productSchema>;
