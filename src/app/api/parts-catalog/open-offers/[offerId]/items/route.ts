import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/modules/settings/actions/get-settings";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { offerId } = await params;

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { status: true, _count: { select: { items: true } } },
  });
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (offer.status !== "DRAFT") return NextResponse.json({ error: "Only draft offers can be edited" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const { description, productNumber, quantity, pricePerUnit, unit, discount } = body as {
    description?: string;
    productNumber?: string;
    quantity?: number;
    pricePerUnit?: number;
    unit?: string;
    discount?: number;
  };

  if (!description?.trim()) return NextResponse.json({ error: "description required" }, { status: 400 });

  const settings = await getSettings();
  const vatRate = parseFloat(settings.defaultVATRate) || 22;

  const item = await prisma.offerItem.create({
    data: {
      offerId,
      position: offer._count.items + 1,
      description: description.trim(),
      productNumber: productNumber ?? null,
      quantity: new Prisma.Decimal(quantity ?? 1),
      unit: unit ?? "pcs",
      pricePerUnit: new Prisma.Decimal(pricePerUnit ?? 0),
      vatRate: new Prisma.Decimal(vatRate),
      discount: new Prisma.Decimal(discount ?? 0),
    },
    select: { id: true },
  });

  return NextResponse.json({ itemId: item.id });
}
