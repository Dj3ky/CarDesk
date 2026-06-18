import { z } from "zod";

export const UNITS = ["pcs", "h", "m", "kg", "l", "set", "pair"] as const;

type TFn = (key: string, values?: Record<string, string | number>) => string;

function offerItemSchemaWith(t: TFn) {
  return z.object({
    id: z.string().optional(),
    productId: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => v || undefined),
    productNumber: z
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
    quantity: z.coerce
      .number({ invalid_type_error: t("mustBeNumber") })
      .positive(t("mustBePositive")),
    unit: z.string().max(10).default("pcs"),
    pricePerUnit: z.coerce
      .number({ invalid_type_error: t("mustBeNumber") })
      .min(0, t("cannotBeNegative")),
    vatRate: z.coerce
      .number({ invalid_type_error: t("mustBeNumber") })
      .min(0)
      .max(100)
      .default(22),
    discount: z.coerce
      .number({ invalid_type_error: t("mustBeNumber") })
      .min(0)
      .max(100)
      .default(0),
  });
}

function offerSchemaWith(t: TFn) {
  return z.object({
    customerId: z.string().min(1, t("customerRequired")),
    vehicleId: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => v || undefined),
    mileage: z.coerce
      .number({ invalid_type_error: t("mustBeNumber") })
      .int()
      .min(0)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v === "" || v === undefined ? undefined : Number(v))),
    notes: z
      .string()
      .max(2000)
      .optional()
      .or(z.literal(""))
      .transform((v) => v?.trim() || undefined),
    validUntil: z
      .string()
      .optional()
      .or(z.literal(""))
      .transform((v) => v || undefined),
    hideCatalogNumber: z.boolean().default(false),
    items: z.array(offerItemSchemaWith(t)).min(1, t("itemsRequired")),
  });
}

const englishT: TFn = (key) => {
  const m: Record<string, string> = {
    descriptionRequired: "Description required",
    mustBeNumber: "Must be a number",
    mustBePositive: "Must be greater than 0",
    cannotBeNegative: "Cannot be negative",
    customerRequired: "Customer is required",
    itemsRequired: "At least one item is required",
  };
  return m[key] ?? key;
};

export const offerItemSchema = offerItemSchemaWith(englishT);
export const offerSchema = offerSchemaWith(englishT);

export function createOfferSchema(t: TFn) {
  return offerSchemaWith(t);
}

export type OfferFormValues = z.input<typeof offerSchema>;
export type OfferItemFormValues = z.input<typeof offerItemSchema>;
export type OfferFormParsed = z.output<typeof offerSchema>;
