import { z } from "zod";

export const UNITS = ["pcs", "h", "m", "kg", "l", "set", "pair"] as const;

export const offerItemSchema = z.object({
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
    .min(1, "Description required")
    .max(500)
    .transform((v) => v.trim()),
  quantity: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .positive("Must be greater than 0"),
  unit: z.string().max(10).default("pcs"),
  pricePerUnit: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(0, "Cannot be negative"),
  vatRate: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(0)
    .max(100)
    .default(22),
  discount: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(0)
    .max(100)
    .default(0),
});

export const offerSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  mileage: z.coerce
    .number({ invalid_type_error: "Must be a number" })
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
  items: z.array(offerItemSchema).min(1, "At least one item is required"),
});

export type OfferFormValues = z.input<typeof offerSchema>;
export type OfferItemFormValues = z.input<typeof offerItemSchema>;
export type OfferFormParsed = z.output<typeof offerSchema>;
