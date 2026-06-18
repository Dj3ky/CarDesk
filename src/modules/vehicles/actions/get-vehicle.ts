"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { VehicleDetail } from "../types";

export async function getVehicle(id: string): Promise<VehicleDetail | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}
