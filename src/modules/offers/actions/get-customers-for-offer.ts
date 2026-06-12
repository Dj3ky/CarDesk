"use server";

import { prisma } from "@/lib/prisma";
import type { CustomerOption } from "../types";

export async function getCustomersForOffer(): Promise<CustomerOption[]> {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, companyName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return customers;
}
