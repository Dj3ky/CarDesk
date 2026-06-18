import { z } from "zod";
import { FuelType } from "@prisma/client";

const CURRENT_YEAR = new Date().getFullYear();

type TFn = (key: string, values?: Record<string, string | number>) => string;

function vehicleSchemaWith(t: TFn) {
  return z.object({
    make: z.string().min(1, t("makeRequired")).max(100),
    model: z.string().min(1, t("modelRequired")).max(100),
    year: z.coerce
      .number({ invalid_type_error: t("mustBeNumber") })
      .int()
      .min(1900, t("yearMin"))
      .max(CURRENT_YEAR + 1, t("yearMax", { max: CURRENT_YEAR + 1 })),
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
      .number({ invalid_type_error: t("mustBeNumber") })
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
}

const englishT: TFn = (key, values) => {
  const m: Record<string, string> = {
    makeRequired: "Make is required",
    modelRequired: "Model is required",
    mustBeNumber: "Must be a number",
    yearMin: "Year must be 1900 or later",
    yearMax: `Year cannot exceed ${CURRENT_YEAR + 1}`,
  };
  const msg = m[key] ?? key;
  if (values && msg.includes("{max}")) return msg.replace("{max}", String(values.max));
  return msg;
};

export const vehicleSchema = vehicleSchemaWith(englishT);

export function createVehicleSchema(t: TFn) {
  return vehicleSchemaWith(t);
}

export type VehicleFormValues = z.input<typeof vehicleSchema>;
export type VehicleFormParsed = z.output<typeof vehicleSchema>;
