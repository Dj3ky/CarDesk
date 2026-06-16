import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOfferNumber } from "@/modules/offers/lib/offer-number";
import { getSettings } from "@/modules/settings/actions/get-settings";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const offers = await prisma.offer.findMany({
    where: { status: "DRAFT" },
    select: {
      id: true,
      offerNumber: true,
      customer: { select: { firstName: true, lastName: true, companyName: true } },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    offers: offers.map((o) => ({
      id: o.id,
      offerNumber: o.offerNumber,
      customerName: o.customer.companyName ?? `${o.customer.firstName} ${o.customer.lastName}`,
      itemCount: o._count.items,
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { customerId } = body as { customerId?: string };
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });

  const settings = await getSettings();
  const offerNumber = await generateOfferNumber(settings.offerPrefix);

  const offer = await prisma.offer.create({
    data: {
      offerNumber,
      customerId,
      currency: settings.currency,
      createdById: session.user.id,
    },
    select: {
      id: true,
      offerNumber: true,
      customer: { select: { firstName: true, lastName: true, companyName: true } },
    },
  });

  await logAudit({
    action: "CREATE",
    entity: "OFFER",
    entityId: offer.id,
    entityLabel: offerNumber,
    userId: session.user.id,
  });

  return NextResponse.json({
    id: offer.id,
    offerNumber: offer.offerNumber,
    customerName: offer.customer.companyName ?? `${offer.customer.firstName} ${offer.customer.lastName}`,
    itemCount: 0,
  });
}
