"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema, type ProductFormValues } from "../schemas/product.schema";
import type { ActionResult } from "../types";

export async function createProduct(data: ProductFormValues): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const parsed = productSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        price: new Prisma.Decimal(parsed.data.price),
        vatRate: new Prisma.Decimal(parsed.data.vatRate),
        createdById: session.user.id,
      },
      select: { id: true },
    });

    revalidatePath("/products");
    revalidatePath("/pricelist");
    return { success: true, data: product };
  } catch (err: unknown) {
    const e = err as { code?: string; meta?: { target?: string[] } };
    if (e?.code === "P2002") {
      const field = e.meta?.target?.includes("barcode") ? "barcode" : "product number";
      return { success: false, error: `A product with this ${field} already exists` };
    }
    return { success: false, error: "Failed to create product" };
  }
}
