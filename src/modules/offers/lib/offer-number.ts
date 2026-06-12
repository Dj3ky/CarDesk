import { prisma } from "@/lib/prisma";

export async function generateOfferNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;

  const count = await prisma.offer.count({
    where: { offerNumber: { startsWith: pattern } },
  });

  const seq = String(count + 1).padStart(3, "0");
  return `${pattern}${seq}`;
}
