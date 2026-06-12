"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import type { ActionResult } from "../types";

export async function toggleUserStatus(userId: string, isActive: boolean): Promise<ActionResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  if (!isActive && session.user.id === userId) {
    return { success: false, error: "selfDeactivateError" };
  }

  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/users");
  return { success: true };
}
