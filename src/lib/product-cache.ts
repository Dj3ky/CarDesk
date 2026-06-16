import { prisma } from "@/lib/prisma";
import type { FilterOptions } from "@/modules/products/types";

// Raw product row matching the findMany select in get-products.ts
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

// Module-level singletons — persist for the lifetime of the Node.js process.
// Populated once at startup via warmProductCache() in instrumentation.ts,
// then cleared on any product mutation so the next request re-fetches.
let _countAll: number | null = null;
let _countActive: number | null = null;
let _filterOptions: FilterOptions | null = null;
let _firstPageAdmin: RawProductRow[] | null = null;   // showInactive=true,  take=25
let _firstPageActive: RawProductRow[] | null = null;  // showInactive=false, take=50

export function invalidateProductCache(): void {
  _countAll = null;
  _countActive = null;
  _filterOptions = null;
  _firstPageAdmin = null;
  _firstPageActive = null;
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

export async function getCachedFirstPageAdmin(): Promise<RawProductRow[]> {
  if (_firstPageAdmin !== null) return _firstPageAdmin;
  _firstPageAdmin = (await prisma.product.findMany({
    orderBy: [{ productNumber: "asc" }],
    take: 25,
    select: FIRST_PAGE_SELECT,
  })) as RawProductRow[];
  return _firstPageAdmin;
}

export async function getCachedFirstPageActive(): Promise<RawProductRow[]> {
  if (_firstPageActive !== null) return _firstPageActive;
  _firstPageActive = (await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ productNumber: "asc" }],
    take: 50,
    select: FIRST_PAGE_SELECT,
  })) as RawProductRow[];
  return _firstPageActive;
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
