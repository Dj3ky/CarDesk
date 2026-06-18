"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CustomerListResult } from "../types";

const PAGE_SIZE = 25;

export async function getCustomers(params: {
  page?: number;
  search?: string;
  active?: boolean;
}): Promise<CustomerListResult> {
  const session = await auth();
  if (!session?.user?.id) return { customers: [], total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 };
  const page = Math.max(1, params.page ?? 1);
  const search = params.search?.trim();

  const where = {
    ...(params.active !== undefined && { isActive: params.active }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { mobile: { contains: search, mode: "insensitive" as const } },
        { companyName: { contains: search, mode: "insensitive" as const } },
        { taxNumber: { contains: search, mode: "insensitive" as const } },
        { city: { contains: search, mode: "insensitive" as const } },
        { vehicles: { some: { make: { contains: search, mode: "insensitive" as const } } } },
        { vehicles: { some: { model: { contains: search, mode: "insensitive" as const } } } },
        { vehicles: { some: { registrationPlate: { contains: search, mode: "insensitive" as const } } } },
        { vehicles: { some: { vin: { contains: search, mode: "insensitive" as const } } } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        mobile: true,
        companyName: true,
        city: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}
