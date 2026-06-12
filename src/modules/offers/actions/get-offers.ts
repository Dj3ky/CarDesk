"use server";

import { prisma } from "@/lib/prisma";
import type { OfferListItem, OfferStatus } from "../types";

const PAGE_SIZE = 20;

export async function getOffers({
  page = 1,
  status,
  search,
}: {
  page?: number;
  status?: string;
  search?: string;
} = {}): Promise<{ offers: OfferListItem[]; total: number; totalPages: number }> {
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    ...(status && status !== "ALL" ? { status: status as OfferStatus } : {}),
    ...(search
      ? {
          OR: [
            { offerNumber: { contains: search, mode: "insensitive" as const } },
            {
              customer: {
                OR: [
                  { firstName: { contains: search, mode: "insensitive" as const } },
                  { lastName: { contains: search, mode: "insensitive" as const } },
                  { companyName: { contains: search, mode: "insensitive" as const } },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where,
      include: {
        customer: { select: { firstName: true, lastName: true, companyName: true } },
        vehicle: { select: { make: true, model: true, year: true } },
        items: {
          select: { quantity: true, pricePerUnit: true, vatRate: true, discount: true },
        },
      },
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
    }),
    prisma.offer.count({ where }),
  ]);

  const result: OfferListItem[] = offers.map((offer) => {
    const grandTotal = offer.items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity.toString());
      const price = parseFloat(item.pricePerUnit.toString());
      const vat = parseFloat(item.vatRate.toString());
      const disc = parseFloat(item.discount.toString());
      const base = qty * price * (1 - disc / 100);
      return sum + base * (1 + vat / 100);
    }, 0);

    return {
      id: offer.id,
      offerNumber: offer.offerNumber,
      status: offer.status as OfferStatus,
      currency: offer.currency,
      createdAt: offer.createdAt,
      validUntil: offer.validUntil,
      customer: offer.customer,
      vehicle: offer.vehicle,
      grandTotal,
      itemCount: offer.items.length,
    };
  });

  return { offers: result, total, totalPages: Math.ceil(total / PAGE_SIZE) };
}
