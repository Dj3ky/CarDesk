"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { updateProfileSchema } from "../schemas/user.schema";
import type { ActionResult } from "../types";

export async function updateProfile(data: unknown): Promise<ActionResult<{ language: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { name, language, currentPassword, newPassword } = parsed.data;

  const updateData: Record<string, unknown> = { name, language };

  if (newPassword) {
    if (!currentPassword) {
      return { success: false, error: "wrongPassword" };
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });
    if (!user?.password) {
      return { success: false, error: "wrongPassword" };
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return { success: false, error: "wrongPassword" };
    }
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  await prisma.user.update({ where: { id: session.user.id }, data: updateData });

  await logAudit({
    action: "UPDATE",
    entity: "USER",
    entityId: session.user.id,
    entityLabel: `${name ?? session.user.name} (${session.user.email})`,
    userId: session.user.id,
    changes: newPassword ? { updated: "password" } : undefined,
  });

  revalidatePath("/profile");
  return { success: true, data: { language } };
}
