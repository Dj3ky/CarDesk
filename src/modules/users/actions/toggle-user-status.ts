"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function toggleUserStatus(userId: string, isActive: boolean): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  if (!isActive && session.user.id === userId) {
    return { success: false, error: "selfDeactivateError" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  await logAudit({
    action: "STATUS_CHANGE",
    entity: "USER",
    entityId: userId,
    entityLabel: user ? `${user.name ?? ""} (${user.email})`.trim() : userId,
    userId: session.user.id,
    changes: { isActive },
  });
  revalidatePath("/users");
  return { success: true };
}
