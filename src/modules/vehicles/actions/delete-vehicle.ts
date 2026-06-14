"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function deleteVehicle(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { success: false, error: "Forbidden" };

  try {
    const existing = await prisma.vehicle.findUnique({
      where: { id },
      select: { make: true, model: true, year: true },
    });
    const vehicle = await prisma.vehicle.delete({ where: { id } });
    await logAudit({
      action: "DELETE",
      entity: "VEHICLE",
      entityId: id,
      entityLabel: existing ? `${existing.make} ${existing.model} (${existing.year})` : id,
      userId: session.user.id,
    });
    revalidatePath(`/customers/${vehicle.customerId}`);
    return { success: true };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2025") return { success: false, error: "Vehicle not found" };
    return { success: false, error: "Failed to delete vehicle" };
  }
}
