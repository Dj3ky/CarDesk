import { z } from "zod";

export const workOrderItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional().transform((v) => v || undefined),
  productNumber: z.string().max(100).optional().transform((v) => v?.trim() || undefined),
  description: z.string().min(1).max(500).transform((v) => v.trim()),
  quantity: z.coerce.number().positive("Must be greater than 0"),
  unit: z.string().max(10).default("pcs"),
  pricePerUnit: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100).default(22),
  discount: z.coerce.number().min(0).max(100).default(0),
});

export const laborItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1).max(500).transform((v) => v.trim()),
  hours: z.coerce.number().positive("Must be greater than 0"),
  hourlyRate: z.coerce.number().min(0),
  vatRate: z.coerce.number().min(0).max(100).default(22),
});

export const workOrderSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  technicianId: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  offerId: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  reportedProblem: z.string().max(2000).optional().transform((v) => v?.trim() || undefined),
  internalNotes: z.string().max(2000).optional().transform((v) => v?.trim() || undefined),
  mileageIn: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => v === "" ? undefined : v as number | undefined),
  mileageOut: z.coerce.number().int().min(0).optional().or(z.literal("")).transform((v) => v === "" ? undefined : v as number | undefined),
  scheduledAt: z.string().optional().transform((v) => v || undefined),
  items: z.array(workOrderItemSchema).default([]),
  laborItems: z.array(laborItemSchema).default([]),
});

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>;
export type WorkOrderItemFormValues = z.infer<typeof workOrderItemSchema>;
export type LaborItemFormValues = z.infer<typeof laborItemSchema>;
