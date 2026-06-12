"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "../types";

export async function deleteProduct(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { success: false, error: "Forbidden" };

  try {
    await prisma.product.delete({ where: { id } });
    revalidatePath("/products");
    revalidatePath("/pricelist");
    return { success: true };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2025") return { success: false, error: "Product not found" };
    return { success: false, error: "Failed to delete product" };
  }
}
