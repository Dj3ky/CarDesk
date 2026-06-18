import { prisma } from "@/lib/prisma";
import type { FilterOptions } from "@/modules/products/types";

export type RawProductRow = {
  id: string;
  productNumber: string;
  barcode: string | null;
  description: string;
  brand: string | null;
  supplier: string | null;
  substitutionPart: string | null;
  notes: string | null;
  price: { toString(): string };
  vatRate: { toString(): string };
  stock: number;
  unit: string;
  isActive: boolean;
};

const FIRST_PAGE_SELECT = {
  id: true,
  productNumber: true,
  barcode: true,
  description: true,
  brand: true,
  supplier: true,
  substitutionPart: true,
  notes: true,
  price: true,
  vatRate: true,
  stock: true,
  unit: true,
  isActive: true,
} as const;

// ─── globalThis store ────────────────────────────────────────────────────────
// Module-level variables are NOT shared across Next.js bundle chunks.
// globalThis IS shared across all module instances in the same Node.js process,
// so cache populated by instrumentation.ts is visible to every page render.

interface ProductCacheStore {
  countAll: number | null;
  countActive: number | null;
  filterOptions: FilterOptions | null;
  firstPageAdmin: RawProductRow[] | null;
  firstPageActive: RawProductRow[] | null;
}

const g = globalThis as typeof globalThis & { __productCache?: ProductCacheStore };

if (!g.__productCache) {
  g.__productCache = {
    countAll: null,
    countActive: null,
    filterOptions: null,
    firstPageAdmin: null,
    firstPageActive: null,
  };
}

const store = g.__productCache;

// ─── Public API ──────────────────────────────────────────────────────────────

export function invalidateProductCache(): void {
  store.countAll = null;
  store.countActive = null;
  store.filterOptions = null;
  store.firstPageAdmin = null;
  store.firstPageActive = null;
}

export async function getCachedCountAll(): Promise<number> {
  if (store.countAll !== null) return store.countAll;
  store.countAll = await prisma.product.count();
  return store.countAll;
}

export async function getCachedCountActive(): Promise<number> {
  if (store.countActive !== null) return store.countActive;
  store.countActive = await prisma.product.count({ where: { isActive: true } });
  return store.countActive;
}

export async function getCachedFilterOptions(): Promise<FilterOptions> {
  if (store.filterOptions !== null) return store.filterOptions;

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

  store.filterOptions = {
    brands: brandRows.map((r) => r.brand!),
    suppliers: supplierRows.map((r) => r.supplier!),
  };
  return store.filterOptions;
}

export async function getCachedFirstPageAdmin(): Promise<RawProductRow[]> {
  if (store.firstPageAdmin !== null) return store.firstPageAdmin;
  store.firstPageAdmin = (await prisma.product.findMany({
    orderBy: [{ productNumber: "asc" }],
    take: 25,
    select: FIRST_PAGE_SELECT,
  })) as RawProductRow[];
  return store.firstPageAdmin;
}

export async function getCachedFirstPageActive(): Promise<RawProductRow[]> {
  if (store.firstPageActive !== null) return store.firstPageActive;
  store.firstPageActive = (await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ productNumber: "asc" }],
    take: 50,
    select: FIRST_PAGE_SELECT,
  })) as RawProductRow[];
  return store.firstPageActive;
}

export async function warmProductCache(): Promise<void> {
  await Promise.all([
    getCachedCountAll(),
    getCachedCountActive(),
    getCachedFilterOptions(),
    getCachedFirstPageAdmin(),
    getCachedFirstPageActive(),
  ]);
}
