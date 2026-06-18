"use server";

import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function togglePriceRule(id: string, isActive: boolean) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false as const, error: "Forbidden" };
  await prisma.priceRule.update({ where: { id }, data: { isActive } });
  revalidateTag("price-rules", { expire: 0 });
  return { success: true as const };
}
