"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { offerSchema } from "../schemas/offer.schema";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function updateOffer(
  id: string,
  data: unknown
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const parsed = offerSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const existing = await prisma.offer.findUnique({ where: { id }, select: { status: true, offerNumber: true } });
  if (!existing) return { success: false, error: "Offer not found" };
  if (existing.status !== "DRAFT") return { success: false, error: "Only draft offers can be edited" };

  const d = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { id },
        data: {
          customerId: d.customerId,
          vehicleId: d.vehicleId ?? null,
          mileage: d.mileage ?? null,
          notes: d.notes ?? null,
          validUntil: d.validUntil ? new Date(d.validUntil) : null,
          hideCatalogNumber: d.hideCatalogNumber ?? false,
        },
      });

      await tx.offerItem.deleteMany({ where: { offerId: id } });

      await tx.offerItem.createMany({
        data: d.items.map((item, i) => ({
          offerId: id,
          position: i + 1,
          productId: item.productId ?? null,
          productNumber: item.productNumber ?? null,
          description: item.description,
          quantity: new Prisma.Decimal(item.quantity),
          unit: item.unit,
          pricePerUnit: new Prisma.Decimal(item.pricePerUnit),
          vatRate: new Prisma.Decimal(item.vatRate),
          discount: new Prisma.Decimal(item.discount),
        })),
      });
    });

    await logAudit({
      action: "UPDATE",
      entity: "OFFER",
      entityId: id,
      entityLabel: existing.offerNumber,
      userId: session.user?.id,
    });

    revalidatePath("/offers");
    revalidatePath(`/offers/${id}`);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update offer" };
  }
}
