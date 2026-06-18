"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ProductDetail } from "../types";

export async function getProduct(id: string): Promise<ProductDetail | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!product) return null;

  return {
    ...product,
    price: product.price.toString(),
    vatRate: product.vatRate.toString(),
  };
}
