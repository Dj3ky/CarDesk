"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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

  // Active filter — admin can see inactive, pricelist hides them
  if (!filters.showInactive) {
    andConditions.push({ isActive: true });
  }

  // Full-text / multi-field search (benefits from pg_trgm GIN indexes)
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

  // Exact brand / supplier filters
  if (filters.brand) {
    andConditions.push({ brand: { equals: filters.brand, mode: "insensitive" } });
  }
  if (filters.supplier) {
    andConditions.push({ supplier: { equals: filters.supplier, mode: "insensitive" } });
  }

  // Price range — uses B-tree index on price column
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const priceFilter: Prisma.DecimalFilter = {};
    if (filters.minPrice !== undefined) priceFilter.gte = new Prisma.Decimal(filters.minPrice);
    if (filters.maxPrice !== undefined) priceFilter.lte = new Prisma.Decimal(filters.maxPrice);
    andConditions.push({ price: priceFilter });
  }

  const where: Prisma.ProductWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [rawProducts, total] = await Promise.all([
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
        price: true,
        vatRate: true,
        stock: true,
        unit: true,
        isActive: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Serialise Decimals to strings for RSC boundary
  const products: ProductListItem[] = rawProducts.map((p) => ({
    ...p,
    price: p.price.toString(),
    vatRate: p.vatRate.toString(),
  }));

  return { products, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
