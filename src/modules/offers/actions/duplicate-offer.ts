"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOfferNumber } from "../lib/offer-number";
import { getSettings } from "@/modules/settings/actions/get-settings";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

/**
 * Copies an offer (customer, vehicle, items, notes) into a new DRAFT with a
 * fresh number and validity date. Mileage is not copied — it is per visit.
 */
export async function duplicateOffer(id: string): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const source = await prisma.offer.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!source) return { success: false, error: "Offer not found" };

  try {
    const settings = await getSettings();
    const offerNumber = await generateOfferNumber(settings.offerPrefix);

    let validUntil: Date | null = null;
    if (settings.offerValidityDays > 0) {
      validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + settings.offerValidityDays);
    }

    const created = await prisma.$transaction(async (tx) => {
      const offer = await tx.offer.create({
        data: {
          offerNumber,
          customerId: source.customerId,
          vehicleId: source.vehicleId,
          currency: source.currency,
          notes: source.notes,
          validUntil,
          hideCatalogNumber: source.hideCatalogNumber,
          createdById: session.user?.id ?? null,
        },
      });

      await tx.offerItem.createMany({
        data: source.items.map((item) => ({
          offerId: offer.id,
          position: item.position,
          productId: item.productId,
          productNumber: item.productNumber,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          vatRate: item.vatRate,
          discount: item.discount,
        })),
      });

      return offer;
    });

    await logAudit({
      action: "CREATE",
      entity: "OFFER",
      entityId: created.id,
      entityLabel: offerNumber,
      userId: session.user?.id,
      changes: { duplicatedFrom: source.offerNumber },
    });

    revalidatePath("/offers");
    return { success: true, data: { id: created.id } };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2002") {
      return { success: false, error: "Offer number conflict, please try again" };
    }
    return { success: false, error: "Failed to duplicate offer" };
  }
}
