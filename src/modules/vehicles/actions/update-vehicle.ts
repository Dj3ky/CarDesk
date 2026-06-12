"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vehicleSchema, type VehicleFormValues } from "../schemas/vehicle.schema";
import type { ActionResult } from "../types";
import type { Vehicle } from "@prisma/client";

export async function updateVehicle(
  id: string,
  data: VehicleFormValues
): Promise<ActionResult<Vehicle>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const parsed = vehicleSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: parsed.data,
    });

    revalidatePath(`/customers/${vehicle.customerId}`);
    revalidatePath(`/customers/${vehicle.customerId}/vehicles/${id}`);
    return { success: true, data: vehicle };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2002") {
      return { success: false, error: "A vehicle with this VIN already exists" };
    }
    if (e?.code === "P2025") {
      return { success: false, error: "Vehicle not found" };
    }
    return { success: false, error: "Failed to update vehicle" };
  }
}
