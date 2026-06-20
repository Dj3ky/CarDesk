"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { createUserSchema } from "../schemas/user.schema";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function createUser(data: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { name, email, password, role, isActive, permissions, language } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "emailTaken" };
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role, isActive, permissions: role === "ADMIN" ? [] : permissions, language },
    select: { id: true },
  });

  await logAudit({
    action: "CREATE",
    entity: "USER",
    entityId: user.id,
    entityLabel: `${name ?? ""} (${email})`.trim(),
    userId: session.user.id,
  });

  return { success: true, data: { id: user.id } };
}
