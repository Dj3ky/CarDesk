import React from "react";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getOffer } from "@/modules/offers/actions/get-offer";
import { getSettings } from "@/modules/settings/actions/get-settings";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { offerId } = await params;
  const [offer, settings] = await Promise.all([getOffer(offerId), getSettings()]);

  if (!offer) {
    return new Response("Offer not found", { status: 404 });
  }

  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { OfferPDF } = await import("@/modules/offers/pdf/offer-pdf");

  const element = React.createElement(OfferPDF, { offer, settings });
  // renderToBuffer expects ReactElement<DocumentProps> but accepts any component that renders <Document>
  const render = renderToBuffer as (el: React.ReactElement) => Promise<Buffer>;
  const buffer = await render(element);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${offer.offerNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
