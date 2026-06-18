import { z } from "zod";

type TFn = (key: string) => string;

function workOrderItemSchemaWith(t: TFn) {
  return z.object({
    id: z.string().optional(),
    productId: z.string().optional().transform((v) => v || undefined),
    productNumber: z.string().max(100).optional().transform((v) => v?.trim() || undefined),
    description: z.string().min(1, t("descriptionRequired")).max(500).transform((v) => v.trim()),
    quantity: z.coerce.number().positive(t("mustBePositive")),
    unit: z.string().max(10).default("pcs"),
    pricePerUnit: z.coerce.number().min(0),
    vatRate: z.coerce.number().min(0).max(100).default(22),
    discount: z.coerce.number().min(0).max(100).default(0),
  });
}

function laborItemSchemaWith(t: TFn) {
  return z.object({
    id: z.string().optional(),
    description: z.string().min(1, t("descriptionRequired")).max(500).transform((v) => v.trim()),
    hours: z.coerce.number().positive(t("mustBePositive")),
    hourlyRate: z.coerce.number().min(0),
    vatRate: z.coerce.number().min(0).max(100).default(22),
  });
}

function workOrderSchemaWith(t: TFn) {
  return z.object({
    customerId: z.string().min(1, t("customerRequired")),
    vehicleId: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
    technicianId: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
    offerId: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
    reportedProblem: z.string().max(2000).optional().transform((v) => v?.trim() || undefined),
    internalNotes: z.string().max(2000).optional().transform((v) => v?.trim() || undefined),
    mileageIn: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => v === "" ? undefined : v as number | undefined),
    mileageOut: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => v === "" ? undefined : v as number | undefined),
    scheduledAt: z.string().optional().transform((v) => v || undefined),
    items: z.array(workOrderItemSchemaWith(t)).default([]),
    laborItems: z.array(laborItemSchemaWith(t)).default([]),
  });
}

const englishT: TFn = (key) => {
  const m: Record<string, string> = {
    descriptionRequired: "Description required",
    mustBePositive: "Must be greater than 0",
    customerRequired: "Customer is required",
  };
  return m[key] ?? key;
};

export const workOrderItemSchema = workOrderItemSchemaWith(englishT);
export const laborItemSchema = laborItemSchemaWith(englishT);
export const workOrderSchema = workOrderSchemaWith(englishT);

export function createWorkOrderSchema(t: TFn) {
  return workOrderSchemaWith(t);
}

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>;
export type WorkOrderItemFormValues = z.infer<typeof workOrderItemSchema>;
export type LaborItemFormValues = z.infer<typeof laborItemSchema>;
