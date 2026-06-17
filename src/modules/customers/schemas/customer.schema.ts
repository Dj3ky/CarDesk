import { z } from "zod";

export const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z
    .string()
    .email("Invalid email address")
    .max(254)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  phone: z
    .string()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  mobile: z
    .string()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  companyName: z
    .string()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  taxNumber: z
    .string()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  address: z
    .string()
    .max(300)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  city: z
    .string()
    .max(100)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  postalCode: z
    .string()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  country: z.string().min(2).max(10).default("SI"),
  notes: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  defaultDiscount: z
    .union([z.number().min(0).max(100), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  isActive: z.boolean().default(true),
});

export type CustomerFormValues = z.input<typeof customerSchema>;
export type CustomerFormParsed = z.output<typeof customerSchema>;
