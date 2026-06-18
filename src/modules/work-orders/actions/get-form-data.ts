"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type CustomerOption = {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  defaultDiscount: number | null;
};

export type VehicleOption = {
  id: string;
  make: string;
  model: string;
  year: number;
  registrationPlate: string | null;
};

export type TechnicianOption = {
  id: string;
  name: string | null;
  email: string;
};

export async function getCustomersForWorkOrder(): Promise<CustomerOption[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, companyName: true, defaultDiscount: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return customers.map((c) => ({
    ...c,
    defaultDiscount: c.defaultDiscount != null ? parseFloat(c.defaultDiscount.toString()) : null,
  }));
}

export async function getVehiclesForWorkOrder(customerId: string): Promise<VehicleOption[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (!customerId) return [];
  return prisma.vehicle.findMany({
    where: { customerId, isActive: true },
    select: { id: true, make: true, model: true, year: true, registrationPlate: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTechnicians(): Promise<TechnicianOption[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
