"use server";

import { prisma } from "@/lib/prisma";
import type { ProductListItem } from "../types";

export async function getProductByNumber(productNumber: string): Promise<ProductListItem | null> {
  const p = await prisma.product.findFirst({
    where: { productNumber },
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
  });

  if (!p) return null;

  return {
    id: p.id,
    productNumber: p.productNumber,
    barcode: p.barcode,
    description: p.description,
    brand: p.brand,
    supplier: p.supplier,
    substitutionPart: p.substitutionPart,
    price: p.price.toString(),
    vatRate: p.vatRate.toString(),
    stock: p.stock,
    unit: p.unit,
    isActive: p.isActive,
  };
}
