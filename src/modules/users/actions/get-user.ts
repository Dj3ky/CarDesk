"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserListItem } from "../types";

export async function getUser(id: string): Promise<UserListItem | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      permissions: true,
      createdAt: true,
    },
  });
  return user as UserListItem | null;
}
