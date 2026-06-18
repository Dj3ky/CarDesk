"use server";

import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCachedCountAll,
  getCachedCountActive,
  getCachedFirstPageAdmin,
  getCachedFirstPageActive,
  type RawProductRow,
} from "@/lib/product-cache";
import { getActivePriceRules } from "@/modules/price-rules/actions/get-price-rules";
import { findMatchingRule, applyRule } from "@/modules/price-rules/lib/apply-rule";
import type { ProductFilters, ProductListItem, ProductListResult } from "../types";

const PAGE_SIZE_ADMIN = 25;
const PAGE_SIZE_PRICELIST = 50;

function transformRows(rows: RawProductRow[], priceRules: Awaited<ReturnType<typeof getActivePriceRules>>): ProductListItem[] {
  return rows.map((p) => {
    const basePrice = parseFloat(p.price.toString());
    const rule = findMatchingRule(p.brand, p.supplier, priceRules);
    const adjusted = rule ? applyRule(basePrice, rule) : undefined;
    return {
      ...p,
      price: p.price.toString(),
      vatRate: p.vatRate.toString(),
      ...(adjusted !== undefined && { adjustedPrice: adjusted.toFixed(2) }),
    };
  });
}

export async function getProducts(
  filters: ProductFilters & { page?: number; pageSize?: "admin" | "pricelist" }
): Promise<ProductListResult> {
  const session = await auth();
  if (!session?.user?.id) return { products: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize === "pricelist" ? PAGE_SIZE_PRICELIST : PAGE_SIZE_ADMIN;
  const search = filters.search?.trim();

  const hasUserFilters = !!(
    search ||
    filters.brand ||
    filters.supplier ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  );

  // Fast path: default first page served entirely from in-memory cache.
  if (!hasUserFilters && page === 1) {
    const [rawRows, total, priceRules] = await Promise.all([
      filters.showInactive ? getCachedFirstPageAdmin() : getCachedFirstPageActive(),
      filters.showInactive ? getCachedCountAll() : getCachedCountActive(),
      getActivePriceRules(),
    ]);
    const products = transformRows(rawRows, priceRules);
    return { products, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // Filtered / paginated path — hit the database directly.
  const andConditions: Prisma.ProductWhereInput[] = [];

  if (!filters.showInactive) {
    andConditions.push({ isActive: true });
  }

  if (search) {
    andConditions.push({
      OR: [
        { productNumber: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { supplier: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (filters.brand) {
    andConditions.push({ brand: { equals: filters.brand, mode: "insensitive" } });
  }
  if (filters.supplier) {
    andConditions.push({ supplier: { equals: filters.supplier, mode: "insensitive" } });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const priceFilter: Prisma.DecimalFilter = {};
    if (filters.minPrice !== undefined) priceFilter.gte = new Prisma.Decimal(filters.minPrice);
    if (filters.maxPrice !== undefined) priceFilter.lte = new Prisma.Decimal(filters.maxPrice);
    andConditions.push({ price: priceFilter });
  }

  const where: Prisma.ProductWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [rawProducts, total, priceRules] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ productNumber: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
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
      },
    }),
    hasUserFilters
      ? prisma.product.count({ where })
      : filters.showInactive ? getCachedCountAll() : getCachedCountActive(),
    getActivePriceRules(),
  ]);

  const products = transformRows(rawProducts as RawProductRow[], priceRules);
  return { products, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
