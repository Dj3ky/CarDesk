import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { offerId } = await params;

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          product: { select: { price: true } },
        },
      },
    },
  });

  if (!offer) {
    return new Response("Not found", { status: 404 });
  }

  const header = [
    "#",
    "Šifra artikla",
    "Naziv artikla",
    "Kol.",
    "EM",
    "Cena brez DDV",
    "MPC",
    "R %",
    "DDV %",
    "Vrednost brez DDV",
    "Vrednost",
  ];

  const rows = offer.items.map((item, idx) => {
    const qty = Number(item.quantity);
    const price = Number(item.pricePerUnit);
    const disc = Number(item.discount);
    const vat = Number(item.vatRate);
    const catalogPrice = item.product ? Number(item.product.price) : null;
    const mpc = catalogPrice !== null
      ? Math.round(catalogPrice * (1 + vat / 100) * 100) / 100
      : "";

    const subtotal = qty * price;
    const baseNet = subtotal - subtotal * (disc / 100);
    const lineTotal = baseNet + baseNet * (vat / 100);

    return [
      idx + 1,
      item.productNumber ?? "",
      item.description,
      qty,
      item.unit,
      price,
      mpc,
      disc,
      vat,
      Math.round(baseNet * 100) / 100,
      Math.round(lineTotal * 100) / 100,
    ];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  ws["!cols"] = [
    { wch: 4 },
    { wch: 14 },
    { wch: 32 },
    { wch: 6 },
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 6 },
    { wch: 6 },
    { wch: 16 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Ponudba");
  const buffer: Buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${offer.offerNumber}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
