import { z } from "zod";
import { FuelType } from "@prisma/client";

const CURRENT_YEAR = new Date().getFullYear();

export const vehicleSchema = z.object({
  make: z.string().min(1, "Make is required").max(100),
  model: z.string().min(1, "Model is required").max(100),
  year: z.coerce
    .number({ invalid_type_error: "Year must be a number" })
    .int()
    .min(1900, "Year must be 1900 or later")
    .max(CURRENT_YEAR + 1, `Year cannot exceed ${CURRENT_YEAR + 1}`),
  vin: z
    .string()
    .max(17)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  registrationPlate: z
    .string()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  fuelType: z.nativeEnum(FuelType).default(FuelType.PETROL),
  mileage: z.coerce
    .number({ invalid_type_error: "Mileage must be a number" })
    .int()
    .min(0)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v))),
  color: z
    .string()
    .max(50)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  notes: z
    .string()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  isActive: z.boolean().default(true),
});

export type VehicleFormValues = z.input<typeof vehicleSchema>;
export type VehicleFormParsed = z.output<typeof vehicleSchema>;
