"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserListItem } from "../types";

export async function getUsers(): Promise<UserListItem[]> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return [];
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return users as UserListItem[];
}
