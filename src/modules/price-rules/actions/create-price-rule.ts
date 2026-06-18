"use server";

import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { priceRuleSchema, type PriceRuleFormValues } from "../schemas/price-rule.schema";

export async function createPriceRule(values: PriceRuleFormValues) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { success: false as const, error: "Forbidden" };
  const parsed = priceRuleSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false as const, error: "Invalid input" };
  }
  const { filterType, filterValue, adjustmentType, adjustmentValue } = parsed.data;
  await prisma.priceRule.create({
    data: {
      filterType,
      filterValue: filterValue.trim(),
      adjustmentType,
      adjustmentValue: new Prisma.Decimal(adjustmentValue),
    },
  });
  revalidateTag("price-rules", { expire: 0 });
  return { success: true as const };
}
