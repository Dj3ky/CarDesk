"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { WorkOrderListItem, WorkOrderStatus } from "../types";

interface GetWorkOrdersOptions {
  page?: number;
  status?: string;
  search?: string;
  groupBy?: string;
}

const PAGE_SIZE = 20;

export async function getWorkOrders({ page = 1, status, search, groupBy }: GetWorkOrdersOptions = {}): Promise<{
  workOrders: WorkOrderListItem[];
  total: number;
  totalPages: number;
}> {
  const session = await auth();
  if (!session?.user?.id) return { workOrders: [], total: 0, totalPages: 0 };
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(status && status !== "ALL" ? { status: status as WorkOrderStatus } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: "insensitive" as const } },
            { reportedProblem: { contains: search, mode: "insensitive" as const } },
            { internalNotes: { contains: search, mode: "insensitive" as const } },
            { customer: { firstName: { contains: search, mode: "insensitive" as const } } },
            { customer: { lastName: { contains: search, mode: "insensitive" as const } } },
            { customer: { companyName: { contains: search, mode: "insensitive" as const } } },
            { customer: { phone: { contains: search, mode: "insensitive" as const } } },
            { customer: { email: { contains: search, mode: "insensitive" as const } } },
            { vehicle: { registrationPlate: { contains: search, mode: "insensitive" as const } } },
            { vehicle: { make: { contains: search, mode: "insensitive" as const } } },
            { vehicle: { model: { contains: search, mode: "insensitive" as const } } },
            { vehicle: { vin: { contains: search, mode: "insensitive" as const } } },
            { items: { some: { description: { contains: search, mode: "insensitive" as const } } } },
            { items: { some: { productNumber: { contains: search, mode: "insensitive" as const } } } },
            { laborItems: { some: { description: { contains: search, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const orderBy =
    groupBy === "customer"
      ? [
          { customer: { companyName: "asc" as const } },
          { customer: { firstName: "asc" as const } },
          { createdAt: "desc" as const },
        ]
      : [{ createdAt: "desc" as const }];

  const [workOrders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy,
      select: {
        id: true,
        number: true,
        status: true,
        scheduledAt: true,
        completedAt: true,
        createdAt: true,
        customer: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        vehicle: { select: { id: true, make: true, model: true, registrationPlate: true } },
        technician: { select: { id: true, name: true } },
      },
    }),
    prisma.workOrder.count({ where }),
  ]);

  return {
    workOrders: workOrders as WorkOrderListItem[],
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}
