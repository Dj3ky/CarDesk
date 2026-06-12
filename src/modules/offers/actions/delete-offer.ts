"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "../types";

export async function deleteOffer(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { success: false, error: "Forbidden" };

  const offer = await prisma.offer.findUnique({ where: { id }, select: { status: true } });
  if (!offer) return { success: false, error: "Offer not found" };
  if (offer.status !== "DRAFT") {
    return { success: false, error: "Only draft offers can be deleted" };
  }

  await prisma.offer.delete({ where: { id } });
  revalidatePath("/offers");
  return { success: true };
}
