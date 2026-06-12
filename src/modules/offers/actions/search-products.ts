"use server";

import { prisma } from "@/lib/prisma";
import type { ProductSearchResult } from "../types";

export async function searchProductsForOffer(query: string): Promise<ProductSearchResult[]> {
  if (!query.trim()) return [];

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { productNumber: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      productNumber: true,
      description: true,
      brand: true,
      price: true,
      vatRate: true,
      unit: true,
    },
    take: 10,
    orderBy: { productNumber: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    productNumber: p.productNumber,
    description: p.description,
    brand: p.brand,
    price: p.price.toString(),
    vatRate: p.vatRate.toString(),
    unit: p.unit,
  }));
}
