"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { FilterOptions } from "../types";

async function fetchFilterOptions(): Promise<FilterOptions> {
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

export const getFilterOptions = unstable_cache(fetchFilterOptions, ["product-filter-options"], {
  revalidate: 3600,
  tags: ["products"],
});
