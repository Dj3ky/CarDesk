"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { workOrderSchema } from "../schemas/work-order.schema";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

const EDITABLE_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_PARTS"];

export async function updateWorkOrder(id: string, data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const existing = await prisma.workOrder.findUnique({
    where: { id },
    select: { status: true, number: true },
  });
  if (!existing) return { success: false, error: "Work order not found" };
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    return { success: false, error: "Cannot edit a completed or invoiced work order" };
  }

  const parsed = workOrderSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const d = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.workOrder.update({
      where: { id },
      data: {
        customerId: d.customerId,
        vehicleId: d.vehicleId ?? null,
        technicianId: d.technicianId ?? null,
        offerId: d.offerId ?? null,
        reportedProblem: d.reportedProblem ?? null,
        internalNotes: d.internalNotes ?? null,
        mileageIn: d.mileageIn ?? null,
        scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
      },
    });

    await tx.workOrderItem.deleteMany({ where: { workOrderId: id } });
    await tx.laborItem.deleteMany({ where: { workOrderId: id } });

    if (d.items.length > 0) {
      await tx.workOrderItem.createMany({
        data: d.items.map((item, i) => ({
          workOrderId: id,
          position: i + 1,
          productId: item.productId ?? null,
          productNumber: item.productNumber ?? null,
          description: item.description,
          quantity: new Prisma.Decimal(item.quantity),
          unit: item.unit,
          pricePerUnit: new Prisma.Decimal(item.pricePerUnit),
          vatRate: new Prisma.Decimal(item.vatRate),
          discount: new Prisma.Decimal(item.discount),
        })),
      });
    }

    if (d.laborItems.length > 0) {
      await tx.laborItem.createMany({
        data: d.laborItems.map((labor, i) => ({
          workOrderId: id,
          position: i + 1,
          description: labor.description,
          hours: new Prisma.Decimal(labor.hours),
          hourlyRate: new Prisma.Decimal(labor.hourlyRate),
          vatRate: new Prisma.Decimal(labor.vatRate),
        })),
      });
    }
  });

  await logAudit({
    action: "UPDATE",
    entity: "WORK_ORDER",
    entityId: id,
    entityLabel: existing.number,
    userId: session.user?.id,
  });

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  return { success: true };
}
