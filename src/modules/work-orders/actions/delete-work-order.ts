"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function deleteWorkOrder(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const wo = await prisma.workOrder.findUnique({
    where: { id },
    select: { status: true, number: true },
  });
  if (!wo) return { success: false, error: "Work order not found" };

  if (wo.status === "INVOICED") {
    return { success: false, error: "Cannot delete an invoiced work order" };
  }

  await prisma.workOrder.delete({ where: { id } });

  await logAudit({
    action: "DELETE",
    entity: "WORK_ORDER",
    entityId: id,
    entityLabel: wo.number,
    userId: session.user?.id,
  });

  revalidatePath("/work-orders");
  return { success: true };
}
