"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCachedCountAll, getCachedCountActive } from "@/lib/product-cache";
import { getActivePriceRules } from "@/modules/price-rules/actions/get-price-rules";
import { findMatchingRule, applyRule } from "@/modules/price-rules/lib/apply-rule";
import type { ProductFilters, ProductListItem, ProductListResult } from "../types";

const PAGE_SIZE_ADMIN = 25;
const PAGE_SIZE_PRICELIST = 50;

export async function getProducts(
  filters: ProductFilters & { page?: number; pageSize?: "admin" | "pricelist" }
): Promise<ProductListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize === "pricelist" ? PAGE_SIZE_PRICELIST : PAGE_SIZE_ADMIN;
  const search = filters.search?.trim();

  const andConditions: Prisma.ProductWhereInput[] = [];

  if (!filters.showInactive) {
    andConditions.push({ isActive: true });
  }

  const hasUserFilters = !!(
    search ||
    filters.brand ||
    filters.supplier ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  );

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

  // Default views use the in-memory cached count; filtered views run exact COUNT.
  const getCount = hasUserFilters
    ? () => prisma.product.count({ where })
    : filters.showInactive
      ? getCachedCountAll
      : getCachedCountActive;

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
    getCount(),
    getActivePriceRules(),
  ]);

  const products: ProductListItem[] = rawProducts.map((p) => {
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

  return { products, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
