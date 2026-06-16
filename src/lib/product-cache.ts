import { prisma } from "@/lib/prisma";
import type { FilterOptions } from "@/modules/products/types";

// Module-level singletons — persist for the lifetime of the Node.js process.
// Populated once at startup via warmProductCache() in instrumentation.ts,
// then cleared on any product mutation so the next request re-fetches.
let _countAll: number | null = null;
let _countActive: number | null = null;
let _filterOptions: FilterOptions | null = null;

export function invalidateProductCache(): void {
  _countAll = null;
  _countActive = null;
  _filterOptions = null;
}

export async function getCachedCountAll(): Promise<number> {
  if (_countAll !== null) return _countAll;
  _countAll = await prisma.product.count();
  return _countAll;
}

export async function getCachedCountActive(): Promise<number> {
  if (_countActive !== null) return _countActive;
  _countActive = await prisma.product.count({ where: { isActive: true } });
  return _countActive;
}

export async function getCachedFilterOptions(): Promise<FilterOptions> {
  if (_filterOptions !== null) return _filterOptions;

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

  _filterOptions = {
    brands: brandRows.map((r) => r.brand!),
    suppliers: supplierRows.map((r) => r.supplier!),
  };
  return _filterOptions;
}

export async function warmProductCache(): Promise<void> {
  await Promise.all([getCachedCountAll(), getCachedCountActive(), getCachedFilterOptions()]);
}
