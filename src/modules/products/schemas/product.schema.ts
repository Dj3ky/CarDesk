import { z } from "zod";

export const VAT_PRESETS = [0, 5, 9.5, 22] as const;

export const UNITS = ["pcs", "m", "kg", "l", "set", "pair"] as const;
export type Unit = (typeof UNITS)[number];

export const productSchema = z.object({
  productNumber: z
    .string()
    .min(1, "Product number is required")
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
    .min(1, "Description is required")
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
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, "Price cannot be negative")
    .multipleOf(0.01),
  vatRate: z.coerce
    .number({ invalid_type_error: "VAT must be a number" })
    .min(0)
    .max(100),
  stock: z.coerce
    .number({ invalid_type_error: "Stock must be a number" })
    .int()
    .default(0),
  unit: z.string().default("pcs"),
  isActive: z.boolean().default(true),
  notes: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v?.trim() || undefined),
});

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductFormParsed = z.output<typeof productSchema>;
