"use server";

import { prisma } from "@/lib/prisma";
import { getActivePriceRules } from "@/modules/price-rules/actions/get-price-rules";
import { findMatchingRule, applyRule } from "@/modules/price-rules/lib/apply-rule";
import type { ProductSearchResult } from "../types";

export async function searchProductsForOffer(query: string): Promise<ProductSearchResult[]> {
  if (!query.trim()) return [];

  const [products, priceRules] = await Promise.all([
    prisma.product.findMany({
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
        supplier: true,
        substitutionPart: true,
        price: true,
        vatRate: true,
        unit: true,
      },
      take: 10,
      orderBy: { productNumber: "asc" },
    }),
    getActivePriceRules(),
  ]);

  return products.map((p) => {
    const basePrice = parseFloat(p.price.toString());
    const rule = findMatchingRule(p.brand, p.supplier, priceRules);
    const adjusted = rule ? applyRule(basePrice, rule) : undefined;
    return {
      id: p.id,
      productNumber: p.productNumber,
      description: p.description,
      brand: p.brand,
      substitutionPart: p.substitutionPart,
      price: p.price.toString(),
      vatRate: p.vatRate.toString(),
      unit: p.unit,
      ...(adjusted !== undefined && { adjustedPrice: adjusted.toFixed(2) }),
    };
  });
}
