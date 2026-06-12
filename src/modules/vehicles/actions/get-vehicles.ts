"use server";

import { prisma } from "@/lib/prisma";
import type { VehicleListItem } from "../types";

export async function getVehiclesByCustomer(customerId: string): Promise<VehicleListItem[]> {
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
