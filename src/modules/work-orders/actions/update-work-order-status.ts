"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { WorkOrderStatus } from "../types";
import type { ActionResult } from "../types";

const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  OPEN:          ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS:   ["WAITING_PARTS", "DONE", "CANCELLED"],
  WAITING_PARTS: ["IN_PROGRESS", "CANCELLED"],
  DONE:          ["IN_PROGRESS", "INVOICED"],
  INVOICED:      [],
  CANCELLED:     ["OPEN"],
};

export async function updateWorkOrderStatus(
  id: string,
  newStatus: WorkOrderStatus
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const wo = await prisma.workOrder.findUnique({
    where: { id },
    select: { status: true, number: true },
  });
  if (!wo) return { success: false, error: "Work order not found" };

  const current = wo.status as WorkOrderStatus;
  if (!VALID_TRANSITIONS[current].includes(newStatus)) {
    return { success: false, error: `Cannot transition from ${current} to ${newStatus}` };
  }

  const now = new Date();
  const extraData: Record<string, Date | null> = {};
  if (newStatus === "IN_PROGRESS" && current === "OPEN") extraData.startedAt = now;
  if (newStatus === "DONE") extraData.completedAt = now;
  if (newStatus === "IN_PROGRESS" && current !== "OPEN") extraData.completedAt = null;

  await prisma.workOrder.update({
    where: { id },
    data: { status: newStatus, ...extraData },
  });

  await logAudit({
    action: "STATUS_CHANGE",
    entity: "WORK_ORDER",
    entityId: id,
    entityLabel: wo.number,
    userId: session.user?.id,
    changes: { from: current, to: newStatus },
  });

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  return { success: true };
}
