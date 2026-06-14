"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { offerSchema } from "../schemas/offer.schema";
import { generateOfferNumber } from "../lib/offer-number";
import { getSettings } from "@/modules/settings/actions/get-settings";
import { logAudit } from "@/lib/audit";
import type { ActionResult } from "../types";

export async function createOffer(
  data: unknown
): Promise<ActionResult<{ id: string }>> {
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

  const d = parsed.data;

  try {
    const settings = await getSettings();
    const offerNumber = await generateOfferNumber(settings.offerPrefix);

    const offer = await prisma.$transaction(async (tx) => {
      const created = await tx.offer.create({
        data: {
          offerNumber,
          customerId: d.customerId,
          vehicleId: d.vehicleId ?? null,
          mileage: d.mileage ?? null,
          currency: settings.currency,
          notes: d.notes ?? null,
          validUntil: d.validUntil ? new Date(d.validUntil) : null,
          hideCatalogNumber: d.hideCatalogNumber ?? false,
          createdById: session.user?.id ?? null,
        },
      });

      await tx.offerItem.createMany({
        data: d.items.map((item, i) => ({
          offerId: created.id,
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

      return created;
    });

    await logAudit({
      action: "CREATE",
      entity: "OFFER",
      entityId: offer.id,
      entityLabel: offerNumber,
      userId: session.user?.id,
    });

    revalidatePath("/offers");
    return { success: true, data: { id: offer.id } };
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2002") {
      return { success: false, error: "Offer number conflict, please try again" };
    }
    return { success: false, error: "Failed to create offer" };
  }
}
