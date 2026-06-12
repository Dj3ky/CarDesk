"use server";

import { prisma } from "@/lib/prisma";
import type { CustomerDetail } from "../types";

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { vehicles: true } },
    },
  });
}
