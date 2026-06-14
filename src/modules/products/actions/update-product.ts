"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema, type ProductFormValues } from "../schemas/product.schema";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function updateProduct(
  id: string,
  data: ProductFormValues
): Promise<ActionResult<{ id: string }>> {
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
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...parsed.data,
        price: new Prisma.Decimal(parsed.data.price),
        vatRate: new Prisma.Decimal(parsed.data.vatRate),
      },
      select: { productNumber: true, description: true },
    });

    await logAudit({
      action: "UPDATE",
      entity: "PRODUCT",
      entityId: id,
      entityLabel: `${product.productNumber} — ${product.description}`,
      userId: session.user.id,
    });

    revalidatePath("/products");
    revalidatePath("/pricelist");
    revalidateTag("products", { expire: 0 });
    return { success: true, data: { id } };
  } catch (err: unknown) {
    const e = err as { code?: string; meta?: { target?: string[] } };
    if (e?.code === "P2002") {
      const field = e.meta?.target?.includes("barcode") ? "barcode" : "product number";
      return { success: false, error: `A product with this ${field} already exists` };
    }
    if (e?.code === "P2025") return { success: false, error: "Product not found" };
    return { success: false, error: "Failed to update product" };
  }
}
