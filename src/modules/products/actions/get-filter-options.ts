"use server";

import { prisma } from "@/lib/prisma";
import type { FilterOptions } from "../types";

// DISTINCT queries use B-tree index scans — fast even at 100k rows
export async function getFilterOptions(): Promise<FilterOptions> {
  const [brandRows, supplierRows] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, brand: { not: null } },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
      take: 500,
    }),
    prisma.product.findMany({
      where: { isActive: true, supplier: { not: null } },
      select: { supplier: true },
      distinct: ["supplier"],
      orderBy: { supplier: "asc" },
      take: 500,
    }),
  ]);

  return {
    brands: brandRows.map((r) => r.brand!),
    suppliers: supplierRows.map((r) => r.supplier!),
  };
}
