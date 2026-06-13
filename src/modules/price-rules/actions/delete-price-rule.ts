"use server";

import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function deletePriceRule(id: string) {
  await prisma.priceRule.delete({ where: { id } });
  revalidateTag("price-rules", { expire: 0 });
  return { success: true as const };
}
