"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { workOrderSchema } from "../schemas/work-order.schema";
import { generateWorkOrderNumber } from "../lib/work-order-number";
import { getSettings } from "@/modules/settings/actions/get-settings";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function createWorkOrder(data: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const parsed = workOrderSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const d = parsed.data;

  try {
    const settings = await getSettings();
    const number = await generateWorkOrderNumber(settings.workOrderPrefix);

    const wo = await prisma.$transaction(async (tx) => {
      const created = await tx.workOrder.create({
        data: {
          number,
          customerId: d.customerId,
          vehicleId: d.vehicleId ?? null,
          technicianId: d.technicianId ?? null,
          offerId: d.offerId ?? null,
          reportedProblem: d.reportedProblem ?? null,
          internalNotes: d.internalNotes ?? null,
          mileageIn: d.mileageIn ?? null,
          scheduledAt: d.scheduledAt ? new Date(d.scheduledAt) : null,
          createdById: session.user?.id ?? null,
        },
      });

      if (d.items.length > 0) {
        await tx.workOrderItem.createMany({
          data: d.items.map((item, i) => ({
            workOrderId: created.id,
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
            workOrderId: created.id,
            position: i + 1,
            description: labor.description,
            hours: new Prisma.Decimal(labor.hours),
            hourlyRate: new Prisma.Decimal(labor.hourlyRate),
            vatRate: new Prisma.Decimal(labor.vatRate),
          })),
        });
      }

      return created;
    });

    await logAudit({
      action: "CREATE",
      entity: "WORK_ORDER",
      entityId: wo.id,
      entityLabel: number,
      userId: session.user?.id,
    });

    revalidatePath("/work-orders");
    return { success: true, data: { id: wo.id } };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2002") {
      return { success: false, error: "Number conflict, please try again" };
    }
    return { success: false, error: "Failed to create work order" };
  }
}
