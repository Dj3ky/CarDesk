"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { invalidateProductCache } from "@/lib/product-cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function deleteProduct(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { success: false, error: "Forbidden" };

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { productNumber: true, description: true },
    });
    await prisma.product.delete({ where: { id } });
    await logAudit({
      action: "DELETE",
      entity: "PRODUCT",
      entityId: id,
      entityLabel: product ? `${product.productNumber} — ${product.description}` : id,
      userId: session.user.id,
    });
    revalidatePath("/products");
    revalidatePath("/pricelist");
    revalidateTag("products", { expire: 0 });
    invalidateProductCache();
    return { success: true };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2025") return { success: false, error: "Product not found" };
    return { success: false, error: "Failed to delete product" };
  }
}
