"use server";

import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function togglePriceRule(id: string, isActive: boolean) {
  await prisma.priceRule.update({ where: { id }, data: { isActive } });
  revalidateTag("price-rules");
  return { success: true as const };
}
