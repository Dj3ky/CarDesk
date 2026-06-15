"use server";

import { prisma } from "@/lib/prisma";
import { getActivePriceRules } from "@/modules/price-rules/actions/get-price-rules";
import { findMatchingRule, applyRule } from "@/modules/price-rules/lib/apply-rule";
import type { ProductListItem } from "../types";

export async function getProductByNumber(productNumber: string): Promise<ProductListItem | null> {
  const [p, priceRules] = await Promise.all([
    prisma.product.findFirst({
      where: { productNumber },
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
    getActivePriceRules(),
  ]);

  if (!p) return null;

  const basePrice = parseFloat(p.price.toString());
  const rule = findMatchingRule(p.brand, p.supplier, priceRules);
  const adjusted = rule ? applyRule(basePrice, rule) : undefined;

  return {
    id: p.id,
    productNumber: p.productNumber,
    barcode: p.barcode,
    description: p.description,
    brand: p.brand,
    supplier: p.supplier,
    substitutionPart: p.substitutionPart,
    notes: p.notes,
    price: p.price.toString(),
    vatRate: p.vatRate.toString(),
    stock: p.stock,
    unit: p.unit,
    isActive: p.isActive,
    ...(adjusted !== undefined && { adjustedPrice: adjusted.toFixed(2) }),
  };
}
