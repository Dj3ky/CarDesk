"use server";

import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PriceRule } from "../types";

function serialize(r: {
  id: string;
  filterType: string;
  filterValue: string;
  adjustmentType: string;
  adjustmentValue: { toString(): string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PriceRule {
  return {
    ...r,
    filterType: r.filterType as PriceRule["filterType"],
    adjustmentType: r.adjustmentType as PriceRule["adjustmentType"],
    adjustmentValue: r.adjustmentValue.toString(),
  };
}

async function fetchAllRules(): Promise<PriceRule[]> {
  const rows = await prisma.priceRule.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(serialize);
}

async function fetchActiveRules(): Promise<PriceRule[]> {
  const rows = await prisma.priceRule.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serialize);
}

const _getAllPriceRules = unstable_cache(fetchAllRules, ["price-rules-all"], {
  tags: ["price-rules"],
});

const _getActivePriceRules = unstable_cache(fetchActiveRules, ["price-rules-active"], {
  tags: ["price-rules"],
});

export async function getAllPriceRules(): Promise<PriceRule[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  return _getAllPriceRules();
}

export async function getActivePriceRules(): Promise<PriceRule[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  return _getActivePriceRules();
}
