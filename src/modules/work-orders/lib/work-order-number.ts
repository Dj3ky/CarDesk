import { prisma } from "@/lib/prisma";

export async function generateWorkOrderNumber(prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;

  const count = await prisma.workOrder.count({
    where: { number: { startsWith: pattern } },
  });

  const seq = String(count + 1).padStart(3, "0");
  return `${pattern}${seq}`;
}
