"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { VehicleListItem } from "../types";

export async function getVehiclesByCustomer(customerId: string): Promise<VehicleListItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  return prisma.vehicle.findMany({
    where: { customerId },
    orderBy: [{ year: "desc" }, { make: "asc" }, { model: "asc" }],
    select: {
      id: true,
      customerId: true,
      make: true,
      model: true,
      year: true,
      registrationPlate: true,
      fuelType: true,
      mileage: true,
      color: true,
      isActive: true,
      createdAt: true,
    },
  });
}
