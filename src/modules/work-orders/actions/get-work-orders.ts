"use server";

import { prisma } from "@/lib/prisma";
import type { WorkOrderListItem, WorkOrderStatus } from "../types";

interface GetWorkOrdersOptions {
  page?: number;
  status?: string;
  search?: string;
}

const PAGE_SIZE = 20;

export async function getWorkOrders({ page = 1, status, search }: GetWorkOrdersOptions = {}): Promise<{
  workOrders: WorkOrderListItem[];
  total: number;
  totalPages: number;
}> {
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(status && status !== "ALL" ? { status: status as WorkOrderStatus } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: "insensitive" as const } },
            { customer: { firstName: { contains: search, mode: "insensitive" as const } } },
            { customer: { lastName: { contains: search, mode: "insensitive" as const } } },
            { customer: { companyName: { contains: search, mode: "insensitive" as const } } },
            { vehicle: { registrationPlate: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [workOrders, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
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
