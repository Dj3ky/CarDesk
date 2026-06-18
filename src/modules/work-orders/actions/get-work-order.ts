"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WorkOrderDetail } from "../types";

export async function getWorkOrder(id: string): Promise<WorkOrderDetail | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const wo = await prisma.workOrder.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true, phone: true } },
      vehicle: { select: { id: true, make: true, model: true, year: true, registrationPlate: true, vin: true } },
      technician: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      items: { orderBy: { position: "asc" } },
      laborItems: { orderBy: { position: "asc" } },
    },
  });

  if (!wo) return null;

  return {
    ...wo,
    items: wo.items.map((item) => ({
      ...item,
      quantity: item.quantity.toString(),
      pricePerUnit: item.pricePerUnit.toString(),
      vatRate: item.vatRate.toString(),
      discount: item.discount.toString(),
    })),
    laborItems: wo.laborItems.map((labor) => ({
      ...labor,
      hours: labor.hours.toString(),
      hourlyRate: labor.hourlyRate.toString(),
      vatRate: labor.vatRate.toString(),
    })),
  } as WorkOrderDetail;
}
