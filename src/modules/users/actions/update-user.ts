"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { updateUserSchema } from "../schemas/user.schema";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function updateUser(userId: string, data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { name, email, password, role, isActive, permissions } = parsed.data;

  const emailConflict = await prisma.user.findFirst({
    where: { email, id: { not: userId } },
  });
  if (emailConflict) {
    return { success: false, error: "emailTaken" };
  }

  // Guard: don't demote the last admin
  if (role === "EMPLOYEE") {
    const current = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (current?.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return { success: false, error: "lastAdminError" };
      }
    }
  }

  const updateData: Record<string, unknown> = {
    name, email, role, isActive,
    permissions: role === "ADMIN" ? [] : permissions,
  };
  if (password) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  await prisma.user.update({ where: { id: userId }, data: updateData });

  await logAudit({
    action: "UPDATE",
    entity: "USER",
    entityId: userId,
    entityLabel: `${name ?? ""} (${email})`.trim(),
    userId: session.user.id,
  });

  return { success: true };
}
