"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "../types";

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { success: false, error: "Forbidden" };

  try {
    await prisma.customer.delete({ where: { id } });
    revalidatePath("/customers");
    return { success: true };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2025") return { success: false, error: "Customer not found" };
    return { success: false, error: "Failed to delete customer" };
  }
}

export async function deleteCustomerAndRedirect(id: string, locale: string) {
  const result = await deleteCustomer(id);
  if (result.success) {
    redirect(`/${locale}/customers`);
  }
  return result;
}
