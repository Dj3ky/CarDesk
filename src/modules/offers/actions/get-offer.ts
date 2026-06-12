"use server";

import { prisma } from "@/lib/prisma";
import type { OfferDetail, OfferItemData, OfferStatus } from "../types";

export async function getOffer(id: string): Promise<OfferDetail | null> {
  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          postalCode: true,
          country: true,
          taxNumber: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          registrationPlate: true,
          vin: true,
        },
      },
      createdBy: { select: { id: true, name: true } },
      items: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!offer) return null;

  const items: OfferItemData[] = offer.items.map((item) => ({
    id: item.id,
    position: item.position,
    productId: item.productId,
    productNumber: item.productNumber,
    description: item.description,
    quantity: item.quantity.toString(),
    unit: item.unit,
    pricePerUnit: item.pricePerUnit.toString(),
    vatRate: item.vatRate.toString(),
    discount: item.discount.toString(),
  }));

  return {
    id: offer.id,
    offerNumber: offer.offerNumber,
    status: offer.status as OfferStatus,
    customerId: offer.customerId,
    vehicleId: offer.vehicleId,
    currency: offer.currency,
    notes: offer.notes,
    validUntil: offer.validUntil,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    customer: offer.customer,
    vehicle: offer.vehicle,
    createdBy: offer.createdBy,
    items,
  };
}
