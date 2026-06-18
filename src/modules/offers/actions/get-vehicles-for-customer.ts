"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { VehicleOption } from "../types";

export async function getVehiclesForCustomer(customerId: string): Promise<VehicleOption[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (!customerId) return [];

  const vehicles = await prisma.vehicle.findMany({
    where: { customerId, isActive: true },
    select: { id: true, make: true, model: true, year: true, registrationPlate: true },
    orderBy: { createdAt: "desc" },
  });

  return vehicles;
}
