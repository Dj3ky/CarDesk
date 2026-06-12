"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { updateProfileSchema } from "../schemas/user.schema";
import type { ActionResult } from "../types";

export async function updateProfile(data: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = updateProfileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { name, currentPassword, newPassword } = parsed.data;

  const updateData: Record<string, unknown> = { name };

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
  revalidatePath("/profile");
  return { success: true };
}
