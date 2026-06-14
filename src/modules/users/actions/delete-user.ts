"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function deleteUser(userId: string): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  if (session.user.id === userId) {
    return { success: false, error: "selfDeleteError" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true, email: true },
  });
  if (user?.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { success: false, error: "lastAdminError" };
    }
  }

  await prisma.user.delete({ where: { id: userId } });

  await logAudit({
    action: "DELETE",
    entity: "USER",
    entityId: userId,
    entityLabel: user ? `${user.name ?? ""} (${user.email})`.trim() : userId,
    userId: session.user.id,
  });

  revalidatePath("/users");
  return { success: true };
}
