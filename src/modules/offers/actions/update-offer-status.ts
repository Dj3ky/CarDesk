"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionResult, OfferStatus } from "../types";

const VALID_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  DRAFT: ["SENT", "APPROVED"],
  SENT: ["APPROVED", "REJECTED", "DRAFT"],
  APPROVED: ["COMPLETED", "DRAFT"],
  REJECTED: ["DRAFT"],
  COMPLETED: [],
};

export async function updateOfferStatus(
  id: string,
  newStatus: OfferStatus
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const offer = await prisma.offer.findUnique({ where: { id }, select: { status: true } });
  if (!offer) return { success: false, error: "Offer not found" };

  const current = offer.status as OfferStatus;
  if (!VALID_TRANSITIONS[current].includes(newStatus)) {
    return { success: false, error: `Cannot transition from ${current} to ${newStatus}` };
  }

  await prisma.offer.update({ where: { id }, data: { status: newStatus } });
  revalidatePath("/offers");
  revalidatePath(`/offers/${id}`);
  return { success: true };
}
