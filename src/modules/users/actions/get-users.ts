"use server";

import { prisma } from "@/lib/prisma";
import type { UserListItem } from "../types";

export async function getUsers(): Promise<UserListItem[]> {
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
